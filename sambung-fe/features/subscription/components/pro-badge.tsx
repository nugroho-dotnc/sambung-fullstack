"use client";

import { Crown } from "lucide-react";

interface ProBadgeProps {
  size?: "xs" | "sm";
  className?: string;
}

export function ProBadge({ size = "xs", className = "" }: ProBadgeProps) {
  const sizeClasses =
    size === "sm"
      ? "px-3 py-1 text-xs gap-1.5"
      : "px-2 py-0.5 text-[11px] gap-1";
  const iconClasses = size === "sm" ? "w-3.5 h-3.5" : "w-3 h-3";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/70 shrink-0 ${sizeClasses} ${className}`}
    >
      <Crown className={`${iconClasses} shrink-0 text-amber-600 dark:text-amber-400`} />
      <span>Pembeli Pro</span>
    </span>
  );
}
