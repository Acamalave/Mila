"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s/g, "-");
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium mb-1.5"
            style={{
              color: "var(--color-text-secondary)",
              transition: "color 0.3s ease",
            }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "w-full px-4 py-3 rounded-lg appearance-none",
              "transition-all duration-200",
              className
            )}
            style={{
              background: "var(--color-bg-input)",
              color: "var(--color-text-primary)",
              border: error
                ? "1px solid #ef4444"
                : isFocused
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-border-default)",
              boxShadow: isFocused
                ? "0 0 0 2px var(--color-accent-glow)"
                : "none",
              outline: "none",
              transition: "all 0.3s ease",
            }}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
        </div>
        {error && <p className="mt-1 text-sm" style={{ color: "#ef4444" }}>{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
