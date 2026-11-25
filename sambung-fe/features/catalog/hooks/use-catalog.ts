"use client";

import { useQuery } from "@tanstack/react-query";
import { CatalogService } from "../services/catalog.service";
import type { CatalogQueryFilter } from "../schemas";

export const CATALOG_QUERY_KEYS = {
  all: ["catalog"] as const,
  list: (filter?: CatalogQueryFilter) => [...CATALOG_QUERY_KEYS.all, "list", filter] as const,
  detail: (id: string) => [...CATALOG_QUERY_KEYS.all, "detail", id] as const,
};

export function useCatalog(filter?: CatalogQueryFilter) {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.list(filter),
    queryFn: () => CatalogService.getCatalog(filter),
    staleTime: 10_000,
  });
}

export function useCatalogItem(id: string) {
  return useQuery({
    queryKey: CATALOG_QUERY_KEYS.detail(id),
    queryFn: () => CatalogService.getCatalogItem(id),
    enabled: Boolean(id),
    staleTime: 10_000,
  });
}
