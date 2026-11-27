"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "cn";

export function buildPaginationPages(
  currentPage: number,
  totalPages: number
): Array<number | "ellipsis-left" | "ellipsis-right"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const pages: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    start = 2;
    end = 4;
  } else if (currentPage >= totalPages - 2) {
    start = totalPages - 3;
    end = totalPages - 1;
  }

  if (start > 2) pages.push("ellipsis-left");
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  if (end < totalPages - 1) pages.push("ellipsis-right");
  pages.push(totalPages);
  return pages;
}

export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number
) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  return {
    items: items.slice(startIndex, endIndex),
    totalItems,
    totalPages,
    currentPage,
    startIndex,
    endIndex,
  };
}

interface ListPaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export function ListPagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  itemLabel = "data",
  className,
}: ListPaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);
  const pages = buildPaginationPages(safePage, totalPages);

  function handleSelect(e: React.MouseEvent<HTMLAnchorElement>, targetPage: number) {
    e.preventDefault();
    const clamped = Math.min(Math.max(1, targetPage), totalPages);
    if (clamped !== safePage) {
      onPageChange(clamped);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2",
        className
      )}
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        Menampilkan{" "}
        <strong className="text-foreground">
          {startItem.toLocaleString("id-ID")}–{endItem.toLocaleString("id-ID")}
        </strong>{" "}
        dari{" "}
        <strong className="text-foreground">
          {totalItems.toLocaleString("id-ID")}
        </strong>{" "}
        {itemLabel}
      </p>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-start sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`#page-${Math.max(1, safePage - 1)}`}
                text="Sebelumnya"
                aria-label="Halaman sebelumnya"
                aria-disabled={safePage <= 1}
                tabIndex={safePage <= 1 ? -1 : undefined}
                onClick={(e) => handleSelect(e, safePage - 1)}
                className={cn(
                  "text-xs font-semibold",
                  safePage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                )}
              />
            </PaginationItem>

            <PaginationItem className="sm:hidden">
              <span className="px-2.5 text-xs font-semibold tabular-nums text-muted-foreground">
                Hal. {safePage} / {totalPages}
              </span>
            </PaginationItem>

            {pages.map((item) =>
              typeof item === "string" ? (
                <PaginationItem key={item} className="hidden sm:list-item">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={`page-${item}`} className="hidden sm:list-item">
                  <PaginationLink
                    href={`#page-${item}`}
                    isActive={item === safePage}
                    aria-label={`Halaman ${item}`}
                    onClick={(e) => handleSelect(e, item)}
                    className={cn(
                      "text-xs font-semibold tabular-nums cursor-pointer",
                      item === safePage &&
                        "border-primary/40 bg-primary/10 text-primary font-bold"
                    )}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href={`#page-${Math.min(totalPages, safePage + 1)}`}
                text="Berikutnya"
                aria-label="Halaman berikutnya"
                aria-disabled={safePage >= totalPages}
                tabIndex={safePage >= totalPages ? -1 : undefined}
                onClick={(e) => handleSelect(e, safePage + 1)}
                className={cn(
                  "text-xs font-semibold",
                  safePage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
