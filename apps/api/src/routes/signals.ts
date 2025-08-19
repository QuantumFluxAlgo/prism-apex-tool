import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Ticket, AccountState } from '../../../../packages/shared/src/types.ts';
import { openSessionBreakout } from '../../../../packages/signals/src/openSessionBreakout.ts';
import { vwapFirstTouch } from '../../../../packages/signals/src/vwapFirstTouch.ts';
import { checkStopRequired } from '../../../../packages/rules-apex/src/checkStopRequired.ts';
import { checkRRMax5 } from '../../../../packages/rules-apex/src/checkRRMax5.ts';
import { computeTrailingDDLine } from '../../../../packages/rules-apex/src/computeTrailingDDLine.ts';
import { projectStopBreach } from '../../../../packages/rules-apex/src/projectStopBreach.ts';
import { enforceHalfSizeUntilBuffer } from '../../../../packages/rules-apex/src/enforceHalfSizeUntilBuffer.ts';
import { checkConsistency30 } from '../../../../packages/rules-apex/src/checkConsistency30.ts';
import { checkEODCutoff } from '../../../../packages/rules-apex/src/checkEODCutoff.ts';
import { store } from '../store';
import { TradovateClient } from '../../../../packages/clients-tradovate/src/rest.ts';
import { dispatch, type NotifyMessage } from '../../../../packages/notify/src';
import { loadNotifyConfig } from './notify';

const previewSchema = z.object({
  strategy: z.enum(['OPEN_SESSION','VWAP']),
  symbol: z.enum(['ES','NQ','MES','MNQ']),
  contract: z.string(), // e.g., ESU5
  cfg: z.record(z.unknown()),
  bias: z.enum(['LONG','SHORT','NONE']).optional(),
  alreadyTouched: z.boolean().optional()
});

const simplePreviewSchema = z.object({
  symbol: z.string(),
  side: z.enum(['BUY','SELL']),
  entry: z.number(),
  stop: z.number(),
  target: z.number(),
  size: z.number(),
  mode: z.enum(['evaluation','funded'])
});

const commitSchema = z.object({ ticket: z.any() });

function evaluate(ticket: Ticket, acct: AccountState, ctx: {
  netLiqHigh: number,
  ddAmount: number,
  maxContracts: number,
  bufferAchieved: boolean,
  periodProfit: number,
  todayProfit: number,
  now: Date
}) {
  const reasons: string[] = [];
  let hard = false;

  // Required stop
  let r = checkStopRequired(ticket);
  if (!r.ok) { reasons.push(r.reason || 'Stop required'); hard = true; }

  // R:R <= 5
  r = checkRRMax5(ticket);
  if (!r.ok) { reasons.push(r.reason || 'R:R > 5'); hard = true; }

  // DD headroom
  const ddLine = computeTrailingDDLine(ctx.netLiqHigh, ctx.ddAmount);
  r = projectStopBreach(ticket, acct, ddLine);
  if (!r.ok) { reasons.push(r.reason || 'DD breach at stop'); hard = true; }

  // Half-size until buffer
  const r2 = enforceHalfSizeUntilBuffer(ticket.qty, ctx.maxContracts, ctx.bufferAchieved);
  if (!r2.ok) { reasons.push(r2.reason || 'Half-size until buffer'); hard = true; }

  // Consistency
  const cons = checkConsistency30(ctx.todayProfit, ctx.periodProfit);
  if (cons === 'FAIL') { reasons.push('Consistency ≥30%'); }
  else if (cons === 'WARN') { reasons.push('Consistency ≥25% (warn)'); }

  // EOD cutoff
  const eod = checkEODCutoff(ctx.now);
  if (eod === 'BLOCK_NEW') { reasons.push('EOD window: block new tickets'); hard = true; }

  return { block: hard, reasons };
}

export async function signalRoutes(app: FastifyInstance) {
  const client = new TradovateClient();

  app.get('/tickets', async () => {
    const today = new Date().toISOString().slice(0,10);
    return store.getTicketsForDate(today).map(t => ({
      id: t.ticket.id,
      symbol: t.ticket.symbol,
      side: t.ticket.side,
      entry: t.ticket.order.entry,
      stop: t.ticket.order.stop,
      target: t.ticket.order.targets[0],
      size: t.ticket.qty,
      time: t.when,
    }));
  });

  app.post('/signals/preview', async (req, reply) => {
    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) {
      const simple = simplePreviewSchema.safeParse(req.body);
      if (!simple.success) return reply.code(400).send({ error: 'Invalid payload' });
      const { entry, stop, target, size } = simple.data;
      const rr = Math.abs((target - entry) / (entry - stop));
      const block = rr > 5;
      const reasons = block ? ['R:R > 5'] : [];
      return reply.send({ block, reasons, normalized: { entry, stop, target, size } });
    }

    const { strategy, symbol, contract, cfg, bias, alreadyTouched } = parsed.data;
    const now = new Date();

    // Pull bars & account snapshot for evaluation context
    // (Keep it light — typical 500 bars 1m)
    const bars = await client.getBars(symbol, '1m', 500);
    const account = await client.getAccount();

    // Build ticket from selected strategy (pure functions)
    let ticket: Ticket | null = null;
    if (strategy === 'OPEN_SESSION') {
      ticket = openSessionBreakout(bars as any, now, cfg as any);
    } else {
      ticket = vwapFirstTouch(bars as any, now, cfg as any, (bias || 'NONE') as any, Boolean(alreadyTouched));
    }
    if (!ticket) return reply.send({ ticket: null, block: true, reasons: ['No valid signal at this time'] });

    // Evaluate Apex guardrails
    const { netLiqHigh, ddAmount, maxContracts, bufferAchieved, todayProfit, periodProfit } =
      store.getRiskContext(); // configurable, persisted in store

    const evalRes = evaluate(ticket, account as any, {
      netLiqHigh,
      ddAmount,
      maxContracts,
      bufferAchieved,
      periodProfit,
      todayProfit,
      now
    });

    if (evalRes.block) {
      const cfg = loadNotifyConfig();
      const nmsg: NotifyMessage = {
        subject: `RULE_BREACH ${strategy} ${symbol}`,
        text: `Blocked reasons: ${evalRes.reasons.join('; ')}`,
        level: 'WARN',
        tags: ['RULE_BREACH', strategy, symbol],
      };
      await dispatch(cfg, 'RULE_BREACH', nmsg);
    }

    return reply.send({ ticket, ...evalRes });
  });

  app.post('/tickets/commit', async (req, reply) => {
    const parsed = commitSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid payload' });

    const ticket = parsed.data.ticket as Ticket;
    const now = new Date();

    // Re-evaluate with live account state
    const account = await client.getAccount();
    const { netLiqHigh, ddAmount, maxContracts, bufferAchieved, todayProfit, periodProfit } =
      store.getRiskContext();

    const evalRes = evaluate(ticket, account as any, {
      netLiqHigh,
      ddAmount,
      maxContracts,
      bufferAchieved,
      periodProfit,
      todayProfit,
      now
    });

    if (evalRes.block) {
      const cfg = loadNotifyConfig();
      const nmsg: NotifyMessage = {
        subject: `RULE_BREACH ${ticket.symbol}`,
        text: `Blocked reasons: ${evalRes.reasons.join('; ')}`,
        level: 'WARN',
        tags: ['RULE_BREACH', ticket.symbol],
      };
      await dispatch(cfg, 'RULE_BREACH', nmsg);
      return reply.code(400).send({ error: 'Guardrail block', reasons: evalRes.reasons });
    }

    // Persist snapshot (append-only)
    store.appendTicket({ when: now.toISOString(), ticket, reasons: evalRes.reasons });
    return reply.send({ ok: true });
  });
}
