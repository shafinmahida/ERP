import React, { useState, useRef, useCallback } from 'react';
import { Calendar } from 'lucide-react';

interface SmartDateInputProps {
  value: string; // ISO YYYY-MM-DD
  onChange: (isoDate: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

/**
 * SmartDateInput: A fast DD-MM-YYYY text input that replaces the slow native date picker.
 * - Accepts typed input: 31-03-1985, 31/03/1985, or 31031985 (auto-formats)
 * - Internal value is always ISO YYYY-MM-DD
 * - Shows DD-MM-YYYY for the operator
 * - Tiny calendar icon falls back to a hidden native date picker on click
 */
export function SmartDateInput({ value, onChange, className = '', placeholder, id }: SmartDateInputProps) {
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  // Convert ISO YYYY-MM-DD → DD-MM-YYYY for display
  const toDisplay = useCallback((iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return iso;
  }, []);

  // Convert DD-MM-YYYY → ISO YYYY-MM-DD for storage
  const toIso = useCallback((display: string): string => {
    if (!display) return '';
    // Strip all non-digit characters, then parse
    const digits = display.replace(/\D/g, '');
    if (digits.length === 8) {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      const d = parseInt(dd, 10);
      const m = parseInt(mm, 10);
      const y = parseInt(yyyy, 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    return '';
  }, []);

  const [displayVal, setDisplayVal] = useState(toDisplay(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync display when value prop changes externally (and not currently editing)
  React.useEffect(() => {
    if (!isFocused) {
      setDisplayVal(toDisplay(value));
    }
  }, [value, isFocused, toDisplay]);

  // Auto-format as user types: insert dashes after DD and MM
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow digits and dashes/slashes only
    raw = raw.replace(/[^0-9\-\/]/g, '');
    // Normalize slashes to dashes
    raw = raw.replace(/\//g, '-');

    // Auto-insert dashes for pure digit input
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 8 && !raw.includes('-')) {
      // Pure digits — auto-format
      if (digits.length > 4) {
        raw = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
      } else if (digits.length > 2) {
        raw = `${digits.slice(0, 2)}-${digits.slice(2)}`;
      } else {
        raw = digits;
      }
    }

    setDisplayVal(raw);

    // Try to parse and emit ISO
    const iso = toIso(raw);
    if (iso) {
      onChange(iso);
    } else if (raw === '') {
      onChange('');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayVal(toDisplay(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const iso = toIso(displayVal);
    if (iso) {
      onChange(iso);
      setDisplayVal(toDisplay(iso));
    } else if (displayVal.trim() === '') {
      onChange('');
      setDisplayVal('');
    } else {
      // Invalid input — revert to last known good value
      setDisplayVal(toDisplay(value));
    }
  };

  const handleCalendarClick = () => {
    hiddenDateRef.current?.showPicker?.();
    hiddenDateRef.current?.click();
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChange(e.target.value);
      setDisplayVal(toDisplay(e.target.value));
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayVal}
        placeholder={placeholder || 'DD-MM-YYYY'}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        maxLength={10}
        className={`w-full pr-8 ${className}`}
        autoComplete="off"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={handleCalendarClick}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
        title="Open calendar picker"
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>
      <input
        ref={hiddenDateRef}
        type="date"
        value={value || ''}
        onChange={handleNativeDateChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
