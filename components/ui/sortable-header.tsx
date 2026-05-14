"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  label: string;
  field: string;
  currentField: string | null;
  ascending: boolean;
  onSort: (field: string) => void;
  className?: string;
}

export function SortableHeader({ label, field, currentField, ascending, onSort, className }: SortableHeaderProps) {
  const isActive = currentField === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn("flex items-center gap-1 text-left group", className)}
    >
      <span>{label}</span>
      {isActive ? (
        ascending ? <ChevronUp size={10} className="text-ink" /> : <ChevronDown size={10} className="text-ink" />
      ) : (
        <ChevronsUpDown size={10} className="text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
