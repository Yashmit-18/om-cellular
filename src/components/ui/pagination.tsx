"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  currentPage?: number;
  page?: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default function Pagination({ currentPage, page, totalPages, onPageChange }: PaginationProps) {
  const currentPageNum = currentPage ?? page ?? 1;
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(currentPageNum, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPageNum - 1)}
        disabled={currentPageNum === 1}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 
          disabled:cursor-not-allowed cursor-pointer transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((pg, i) =>
        pg === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-gray-400">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <button
            key={pg}
            onClick={() => onPageChange(pg)}
            className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer
              ${pg === currentPageNum
                ? "bg-[#2563eb] text-white shadow-sm"
                : "text-gray-700 hover:bg-gray-100"}`}
            aria-current={pg === currentPageNum ? "page" : undefined}
          >
            {pg}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPageNum + 1)}
        disabled={currentPageNum === totalPages}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 
          disabled:cursor-not-allowed cursor-pointer transition-colors"
        aria-label="Next"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

export { Pagination };
