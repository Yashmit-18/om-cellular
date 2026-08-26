"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  value?: string;
  onChange?: (file: File | null) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  accept = "image/*",
  maxSize = 5,
  className = "",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > maxSize * 1024 * 1024) return;
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange?.(file);
    },
    [maxSize, onChange]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = () => {
    setPreview(null);
    onChange?.(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      {preview ? (
        <div className="relative group rounded-xl overflow-hidden border border-gray-200">
          <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity 
            flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-white text-gray-900 text-sm font-medium rounded-lg cursor-pointer 
                hover:bg-gray-100 transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 bg-white text-red-600 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`w-full h-48 rounded-xl border-2 border-dashed transition-colors cursor-pointer
            flex flex-col items-center justify-center gap-3
            ${isDragging
              ? "border-[#2563eb] bg-[#2563eb]/5"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"}`}
        >
          <div className="p-3 bg-gray-200 rounded-xl">
            <Upload className="h-6 w-6 text-gray-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP up to {maxSize}MB</p>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
      />
    </div>
  );
}

export { ImageUpload };
