"use client";

import { useState, type ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const positionStyles = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export default function Tooltip({ content, children, side = "top", className = "" }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-[90] px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 
            rounded-lg shadow-lg whitespace-nowrap pointer-events-none
            animate-in fade-in duration-150
            ${positionStyles[side]}`}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-gray-900 rotate-45
              ${side === "top" ? "bottom-[-4px] left-1/2 -translate-x-1/2" : ""}
              ${side === "bottom" ? "top-[-4px] left-1/2 -translate-x-1/2" : ""}
              ${side === "left" ? "right-[-4px] top-1/2 -translate-y-1/2" : ""}
              ${side === "right" ? "left-[-4px] top-1/2 -translate-y-1/2" : ""}`}
          />
        </div>
      )}
    </div>
  );
}
