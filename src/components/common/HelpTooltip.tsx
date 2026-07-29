import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  className?: string;
}

export function HelpTooltip({ text, className = '' }: HelpTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={`relative inline-flex items-center ml-1.5 ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-stone-400 hover:text-emerald-700 focus:outline-none transition-colors cursor-pointer"
        aria-label="Help information"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {show && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-2.5 bg-stone-900 text-stone-100 text-xs rounded-lg shadow-xl z-50 pointer-events-none leading-relaxed">
          <div className="font-normal text-stone-200">{text}</div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
        </div>
      )}
    </div>
  );
}
