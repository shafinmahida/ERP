import * as React from 'react';
import { cn } from './button';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-lg border border-[#E2D7C3] bg-white px-3 py-1.5 text-xs text-[#1E1A16] shadow-2xs transition-colors placeholder:text-[#948877] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#856936]/30 focus-visible:border-[#856936] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F7F4EC]',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';
