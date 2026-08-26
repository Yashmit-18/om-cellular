"use client";

import { useState, useRef, useEffect, forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string;
  error?: string;
  required?: boolean;
  options?: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  iconPrefix?: ReactNode;
}

interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

type SelectProps = CustomSelectProps | NativeSelectProps;

function isNativeSelect(props: SelectProps): props is NativeSelectProps {
  return "children" in props && !("options" in props);
}

const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900
          transition-colors duration-150 cursor-pointer appearance-none
          focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
NativeSelect.displayName = "Select";

function CustomDropdown({
  label,
  error,
  required,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  iconPrefix,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between rounded-lg border bg-white px-3.5 py-2.5 
            text-sm text-left transition-colors duration-150 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? "border-red-400" : "border-gray-300"}
            ${isOpen ? "ring-2 ring-[#2563eb]/20 border-[#2563eb]" : ""}
            ${iconPrefix ? "pl-10" : ""}`}
        >
          <span className={selected ? "text-gray-900" : "text-gray-400"}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-gray-200 bg-white 
            shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
            <div className="max-h-60 overflow-auto py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange?.(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-sm cursor-pointer
                    transition-colors duration-100
                    ${option.value === value 
                      ? "bg-[#2563eb]/5 text-[#2563eb]" 
                      : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

function Select(props: SelectProps) {
  if (isNativeSelect(props)) {
    const { children, ...rest } = props;
    return <NativeSelect {...rest}>{children}</NativeSelect>;
  }
  return <CustomDropdown {...props} />;
}

export { Select };
export default Select;
