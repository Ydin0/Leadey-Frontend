"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function DataTablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}: DataTablePaginationProps) {
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSizeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (totalItems === 0) return null;

  function getPageNumbers() {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const rangeStart = Math.max(2, currentPage - 1);
      const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowSizeMenu(!showSizeMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium text-ink-secondary border border-border-subtle hover:bg-hover transition-colors"
            >
              {pageSize} / page
              <ChevronDown size={10} className={cn("transition-transform", showSizeMenu && "rotate-180")} />
            </button>
            {showSizeMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-surface rounded-[8px] border border-border-subtle shadow-lg py-1 z-20 min-w-[80px]">
                {pageSizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      onPageSizeChange(size);
                      setShowSizeMenu(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[11px] transition-colors",
                      size === pageSize
                        ? "font-medium text-ink bg-hover"
                        : "text-ink-secondary hover:bg-hover"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <span className="text-[11px] text-ink-muted">
          Showing {start}&ndash;{end} of {totalItems}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-7 h-7 flex items-center justify-center rounded-full text-ink-muted hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
        </button>
        {getPageNumbers().map((page, i) =>
          page === "ellipsis" ? (
            <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-[11px] text-ink-faint">
              &hellip;
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                page === currentPage
                  ? "bg-ink text-on-ink"
                  : "text-ink-secondary hover:bg-hover"
              )}
            >
              {page}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-full text-ink-muted hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
