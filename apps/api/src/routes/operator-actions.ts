import type { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { recordOperatorActionEvent } from '../observability/events.js';
import {
  TicketNotFoundError,
  type OperatorActionKind,
  recordOperatorAction,
} from '../services/tickets/operatorAction.js';

const ALLOWED_ACTIONS: OperatorActionKind[] = [
  'ACTIONED',
  'ACK',
  'DISMISSED',
  'SKIPPED',
  'MONITORING',
  'MONITORED',
];

interface OperatorActionBody {
  action: string | null;
  note?: string | null;
}

type OperatorActionRequest = FastifyRequest<{
  Params: { ticketId: string };
  Body: OperatorActionBody;
}>;

export default async function operatorActionsRoute(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
): Promise<void> {
  const handler = async (req: OperatorActionRequest, reply: FastifyReply) => {
    const { ticketId } = req.params;
    const { action, note } = req.body ?? {};

    if (!ticketId || typeof ticketId !== 'string') {
      return reply.status(400).send({ ok: false, error: 'ticketId is required' });
    }

    if (!action || !ALLOWED_ACTIONS.includes(action as OperatorActionKind)) {
      return reply.status(400).send({ ok: false, error: 'Invalid action' });
    }

    const trimmedNote =
      typeof note === 'string' && note.trim().length > 0 ? note.trim().slice(0, 500) : null;

    try {
      await recordOperatorAction({
        ticketId,
        action: action as OperatorActionKind,
        note: trimmedNote,
      });
    } catch (err) {
      if (err instanceof TicketNotFoundError) {
        return reply.status(404).send({ ok: false, error: 'Ticket not found' });
      }
      req.log.error({ err, ticketId }, 'operator action failed');
      return reply.status(500).send({ ok: false, error: 'Operator action failed' });
    }

    try {
      recordOperatorActionEvent({
        ticketId,
        action,
        note: trimmedNote,
        source: 'api',
      });
    } catch {
      // Observability must never break workloads.
    }

    return reply.status(204).send();
  };

  app.post('/tickets/:ticketId/operator-action', handler);
  app.post('/api/tickets/:ticketId/operator-action', handler);
}
