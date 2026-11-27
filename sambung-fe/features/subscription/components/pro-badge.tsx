"use client";

import { Crown } from "lucide-react";

interface ProBadgeProps {
  size?: "xs" | "sm";
  className?: string;
}

export function ProBadge({ size = "xs", className = "" }: ProBadgeProps) {
  const boxClasses = size === "sm" ? "w-6 h-6" : "w-5 h-5";
  const iconClasses = size === "sm" ? "w-3.5 h-3.5" : "w-3 h-3";

  return (
    <span
      role="img"
      aria-label="Produsen Pro"
      title="Produsen Pro"
      className={`inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-300/80 dark:border-amber-800/70 shrink-0 ${boxClasses} ${className}`}
    >
      <Crown className={iconClasses} aria-hidden="true" />
    </span>
  );
}
