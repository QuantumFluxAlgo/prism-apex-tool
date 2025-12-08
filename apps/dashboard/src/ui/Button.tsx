import React from 'react';

export type ButtonTone = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
};

export default function Button({
  children,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button type={type ?? 'button'} {...rest}>
      {children}
    </button>
  );
}

