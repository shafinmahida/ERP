import * as React from 'react';
import { cn } from './button';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-xs font-bold text-[#1E1A16] select-none tracking-tight block mb-1', className)}
      {...props}
    />
  )
);
Label.displayName = 'Label';

export function Badge({ className, variant = 'default', children, ...props }: any) {
  const variants: Record<string, string> = {
    default: 'bg-[#F5EFE2] text-[#856936] border-[#E2D7C3]',
    gold: 'bg-[#F5EFE2] text-[#856936] border-[#E2D7C3]',
    secondary: 'bg-[#F2ECE0] text-[#685E52] border-[#E2D7C3]',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    destructive: 'bg-rose-50 text-rose-800 border-rose-200',
    outline: 'border border-[#E2D7C3] text-[#1E1A16] bg-white',
    info: 'bg-amber-50 text-amber-900 border-amber-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-[#E2D7C3] bg-white p-5 text-[#1E1A16] shadow-2xs', className)}
      {...props}
    />
  );
}
