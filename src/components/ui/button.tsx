import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#856936] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-[#856936] text-white hover:bg-[#6E562B] shadow-2xs border border-[#755B2E]',
        gold: 'bg-[#856936] text-white hover:bg-[#6E562B] shadow-2xs border border-[#755B2E]',
        destructive: 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 shadow-2xs',
        outline: 'border border-[#E2D7C3] bg-white text-[#1E1A16] hover:bg-[#F5EFE2] hover:border-[#D4C5A9] shadow-2xs',
        secondary: 'bg-[#F2ECE0] text-[#1E1A16] hover:bg-[#EAE2D2] border border-[#E2D7C3]',
        ghost: 'hover:bg-[#F5EFE2] text-[#1E1A16] hover:text-[#856936]',
        link: 'text-[#856936] underline-offset-4 hover:underline font-semibold',
      },
      size: {
        default: 'h-9 px-4 py-2 text-xs',
        sm: 'h-8 rounded-md px-3 text-[11px]',
        lg: 'h-10 rounded-lg px-6 text-sm',
        icon: 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';
