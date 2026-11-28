import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminTableScroll({ label, className, children }: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn("overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring", className)}
    >
      {children}
    </div>
  );
}
