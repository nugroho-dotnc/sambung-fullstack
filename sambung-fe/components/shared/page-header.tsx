import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page header used at the top of all panels.
 * Consistent typography: Plus Jakarta Sans for title, Atkinson Hyperlegible Next for context.
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
