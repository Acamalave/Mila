"use client";

import { cn } from "@/lib/utils";
import { forwardRef, useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium mb-1.5"
            style={{
              color: "var(--color-text-secondary)",
              transition: "color 0.3s ease",
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            "w-full px-4 py-3 rounded-lg",
            "transition-all duration-200",
            className
          )}
          style={{
            background: "var(--color-bg-input)",
            color: "var(--color-text-primary)",
            border: error
              ? "1px solid #ef4444"
              : isFocused
                ? `1px solid var(--color-accent)`
                : "1px solid var(--color-border-default)",
            boxShadow: error && isFocused
              ? "0 0 0 2px rgba(239, 68, 68, 0.3)"
              : isFocused
                ? "0 0 0 2px var(--color-accent-glow)"
                : "none",
            outline: "none",
            transition: "all 0.3s ease",
          }}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm" style={{ color: "#ef4444" }}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
