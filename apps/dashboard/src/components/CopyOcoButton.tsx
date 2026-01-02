import React from 'react';
import type { TicketRow } from '../lib/api';
import Button from '../ui/Button';
import { useToast } from '../context/ToastContext';

type CopyOcoButtonProps = {
  row?: TicketRow;
  symbol?: string;
  direction?: 'LONG' | 'SHORT' | string;
  qty?: number | null;
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  rr?: number | null;
  disabled?: boolean;
};

export default function CopyOcoButton({
  row,
  symbol,
  direction,
  qty,
  entry,
  stop,
  target,
  rr,
  disabled,
}: CopyOcoButtonProps) {
  const { toast } = useToast();
  const resolvedSymbol = symbol ?? row?.symbol ?? '';
  const resolvedDirection = (direction ?? row?.direction ?? 'LONG') as 'LONG' | 'SHORT' | string;
  const resolvedQty = qty ?? row?.operatorSizing?.qty ?? null;
  const resolvedEntry = entry ?? row?.entry_price ?? null;
  const resolvedStop = stop ?? row?.stop_price ?? null;
  const resolvedTarget = target ?? row?.target_price ?? null;
  const resolvedRr = rr ?? row?.rr ?? null;

  const handleCopy = async () => {
    const lines = [
      `Symbol: ${resolvedSymbol}`,
      `Direction: ${resolvedDirection}`,
      `Qty: ${resolvedQty ?? '—'}`,
      `Entry: ${resolvedEntry ?? '—'}`,
      `Stop: ${resolvedStop ?? '—'}`,
      `Target: ${resolvedTarget ?? '—'}`,
    ];
    if (resolvedRr !== null && resolvedRr !== undefined && !Number.isNaN(resolvedRr)) {
      lines.push(`R:R: ${resolvedRr.toFixed(2)}`);
    }
    const block = lines.join('\n');
    await navigator.clipboard.writeText(block);
    toast('OCO copied to clipboard');
  };

  return (
    <Button
      size="sm"
      tone="primary"
      disabled={disabled}
      onClick={handleCopy}
      title="Copy OCO details"
    >
      Copy OCO
    </Button>
  );
}
