import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidthClassName?: string;
}

/**
 * Standard container used across all pages in SAMBUNG.
 * Ensures consistent max-width, horizontal padding, and vertical spacing.
 */
export function PageContainer({
  children,
  className,
  maxWidthClassName = "max-w-6xl",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6",
        maxWidthClassName,
        className
      )}
    >
      {children}
    </div>
  );
}
