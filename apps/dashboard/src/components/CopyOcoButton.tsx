import React from 'react';
import Button from '../ui/Button';
import { useToast } from '../context/ToastContext';

export default function CopyOcoButton({
  symbol,
  direction,
  entry,
  stop,
  target,
  rr,
  disabled,
}: {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  rr?: number | null;
  disabled?: boolean;
}) {
  const { toast } = useToast();

  const handleCopy = async () => {
    const lines = [
      `Symbol: ${symbol}`,
      `Direction: ${direction}`,
      `Entry: ${entry ?? '—'}`,
      `Stop: ${stop ?? '—'}`,
      `Target: ${target ?? '—'}`,
    ];
    if (rr !== null && rr !== undefined && !Number.isNaN(rr)) {
      lines.push(`R:R: ${rr.toFixed(2)}`);
    }
    const block = lines.join('\n');
    await navigator.clipboard.writeText(block);
    toast('OCO copied to clipboard');
  };

  return (
    <Button size="sm" variant="primary" disabled={disabled} onClick={handleCopy} title="Copy OCO details">
      Copy OCO
    </Button>
  );
}
