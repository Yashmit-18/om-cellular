"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  iconPrefix?: ReactNode;
  iconSuffix?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, iconPrefix, iconSuffix, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {iconPrefix && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {iconPrefix}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 
              placeholder:text-gray-400 transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]
              disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
              ${error ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-300"}
              ${iconPrefix ? "pl-10" : ""} ${iconSuffix ? "pr-10" : ""} ${className}`}
            {...props}
          />
          {iconSuffix && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              {iconSuffix}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
export default Input;
