import React from 'react';
import type { TicketRow } from '../lib/api';

type RiskDisplayState = 'NOT_EVALUATED' | 'OK' | 'WARN' | 'BLOCKED';

type NormalisedRisk = {
  state: RiskDisplayState;
  label: string;
  toneClass: string;
  detail?: string;
  tooltip?: string;
};

function normaliseRisk(row: TicketRow): NormalisedRisk {
  const decision = row.riskDecision ?? null;

  if (!decision) {
    return {
      state: 'NOT_EVALUATED',
      label: 'Not evaluated',
      toneClass:
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-300 bg-slate-50',
      tooltip: 'Risk engine has not evaluated this ticket yet.',
    };
  }

  const {
    allowed,
    reason,
    codes = [],
    warnings = [],
    maxContractsAllowed,
  } = decision;

  const normalisedReason = (reason || '').trim();
  const hardBlockCodes = new Set([
    'TRADING_DISABLED',
    'NEWS_HARD_BLOCK',
    'DAILY_DD_HARD_LIMIT',
    'STRATEGY_SESSION_CONTRACT_CAP',
  ]);
  const hasHardBlockCode = codes.some((code) => hardBlockCodes.has(code));
  const hasNonOkCodes = codes.some((code) => code && code !== 'OK');
  const hasWarnings = warnings.some((warn) => typeof warn === 'string');

  const tooltipParts: string[] = [];
  if (normalisedReason) tooltipParts.push(normalisedReason);
  if (codes.length) tooltipParts.push(`Codes: ${codes.join(', ')}`);
  if (warnings.length) tooltipParts.push(`Warnings: ${warnings.length}`);
  const tooltip = tooltipParts.length ? tooltipParts.join(' | ') : undefined;

  const looksLikePlaceholder =
    !normalisedReason || /not evaluated|no risk decision/i.test(normalisedReason);

  if (looksLikePlaceholder && !hasNonOkCodes && !hasWarnings) {
    return {
      state: 'NOT_EVALUATED',
      label: 'Not evaluated',
      toneClass:
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-300 bg-slate-50',
      tooltip: tooltip ?? 'Risk engine has not evaluated this ticket yet.',
    };
  }

  if (!allowed || hasHardBlockCode) {
    let detail: string | undefined;
    if (hasHardBlockCode) {
      if (codes.includes('TRADING_DISABLED')) detail = 'Trading disabled at account level.';
      else if (codes.includes('NEWS_HARD_BLOCK')) detail = 'Session blocked by news flag.';
      else if (codes.includes('DAILY_DD_HARD_LIMIT')) detail = 'Daily/trailing drawdown limit hit.';
      else if (codes.includes('STRATEGY_SESSION_CONTRACT_CAP')) detail = 'Strategy contract cap hit.';
    }
    if (!detail && normalisedReason) detail = normalisedReason;

    return {
      state: 'BLOCKED',
      label: 'Blocked',
      toneClass:
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold text-red-800 border border-red-200 bg-red-50',
      detail,
      tooltip: tooltip ?? 'Risk engine blocked this ticket.',
    };
  }

  if (hasNonOkCodes || hasWarnings) {
    let detail = normalisedReason || undefined;
    if (!detail && hasWarnings) detail = `Warnings: ${warnings.join(', ')}`;
    if (maxContractsAllowed != null) {
      const capDetail = `Max allowed size: ${maxContractsAllowed} contracts.`;
      detail = detail ? `${detail} ${capDetail}` : capDetail;
    }

    return {
      state: 'WARN',
      label: 'Warn',
      toneClass:
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 bg-amber-50',
      detail,
      tooltip: tooltip ?? 'Allowed with risk warnings / soft caps.',
    };
  }

  return {
    state: 'OK',
    label: 'OK',
    toneClass:
      'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 bg-emerald-50',
    detail: normalisedReason && !/ok/i.test(normalisedReason) ? normalisedReason : undefined,
    tooltip: tooltip ?? 'Risk checks passed.',
  };
}

export interface RiskCellProps {
  row: TicketRow;
}

export const RiskCell: React.FC<RiskCellProps> = ({ row }) => {
  const risk = normaliseRisk(row);

  return (
    <div className="flex flex-col gap-0.5 min-w-[90px]">
      <span className={risk.toneClass} title={risk.tooltip}>
        {risk.label}
      </span>
      {risk.detail ? (
        <span className="text-[10px] leading-tight text-slate-600 truncate" title={risk.detail}>
          {risk.detail}
        </span>
      ) : null}
      {risk.state === 'NOT_EVALUATED' && !risk.detail ? (
        <span className="text-[10px] text-slate-400">Waiting for risk…</span>
      ) : null}
    </div>
  );
};

export default RiskCell;
