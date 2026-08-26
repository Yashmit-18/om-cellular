"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "left" | "right";
  width?: string;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = "left",
  width = "w-[320px]",
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 bottom-0 ${side === "left" ? "left-0" : "right-0"} 
          ${width} bg-white shadow-2xl
          animate-in fade-in duration-200 
          ${side === "left" ? "slide-in-from-left" : "slide-in-from-right"}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 
              transition-colors duration-150 cursor-pointer ml-auto"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-65px)] p-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
