import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTitle({ children, className = '' }: TypographyProps) {
  return (
    <h1 className={`text-2xl font-extrabold text-[#1E1A16] tracking-tight ${className}`}>
      {children}
    </h1>
  );
}

export function SectionTitle({ children, className = '' }: TypographyProps) {
  return (
    <h2 className={`text-base font-bold text-[#1E1A16] tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

export function CardTitle({ children, className = '' }: TypographyProps) {
  return (
    <h3 className={`text-sm font-bold text-[#1E1A16] ${className}`}>
      {children}
    </h3>
  );
}

export function BodyText({ children, className = '' }: TypographyProps) {
  return (
    <p className={`text-xs text-[#685E52] leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export function CaptionText({ children, className = '' }: TypographyProps) {
  return (
    <span className={`text-[10px] font-mono font-semibold text-[#8A7C6B] ${className}`}>
      {children}
    </span>
  );
}
