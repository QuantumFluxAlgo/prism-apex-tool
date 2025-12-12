import React from 'react';

export type ButtonTone = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'text-[0.65rem] px-3 py-1 h-8',
  sm: 'text-[0.72rem] px-4 py-1.5 h-9',
  md: 'text-sm px-5 py-2 h-10',
};

const toneClasses: Record<ButtonTone, string> = {
  primary:
    'bg-gradient-to-r from-cyan-400/90 via-blue-500/90 to-indigo-500/90 text-slate-900 border border-cyan-200/80 shadow-[0_10px_28px_rgba(14,165,233,0.35)] hover:shadow-[0_14px_34px_rgba(14,165,233,0.45)]',
  secondary:
    'bg-slate-900/70 text-slate-100 border border-slate-600 hover:border-cyan-300/70 hover:text-white',
  danger:
    'bg-gradient-to-r from-rose-500/90 to-orange-500/90 text-white border border-rose-200/70 shadow-[0_10px_28px_rgba(248,113,113,0.35)] hover:shadow-[0_14px_34px_rgba(248,113,113,0.45)]',
  ghost:
    'bg-transparent text-slate-200 border border-transparent hover:border-slate-500 hover:bg-slate-900/40',
};

export default function Button({
  children,
  type,
  tone = 'primary',
  size = 'sm',
  className,
  ...rest
}: ButtonProps) {
  const classes = cx(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[0.12em] uppercase transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 disabled:opacity-40 disabled:cursor-not-allowed',
    sizeClasses[size],
    toneClasses[tone],
    className,
  );

  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  );
}
