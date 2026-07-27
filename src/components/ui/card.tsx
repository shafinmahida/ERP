import * as React from 'react';
import { cn } from './button';

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-xs font-semibold uppercase tracking-wider text-slate-400 select-none', className)}
      {...props}
    />
  )
);
Label.displayName = 'Label';

export function Badge({ className, variant = 'default', children, ...props }: any) {
  const variants: Record<string, string> = {
    default: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    secondary: 'bg-slate-800 text-slate-300 border-slate-700',
    gold: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    destructive: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    outline: 'border border-slate-700 text-slate-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
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
      className={cn('rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-slate-100 shadow-sm backdrop-blur-sm', className)}
      {...props}
    />
  );
}
