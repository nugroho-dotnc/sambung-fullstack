import { ApiError } from "@/lib/api/errors";
import { handleAuthRequest } from "./auth.handler";
import { handleOfferRequest } from "./offers";
import { handleContractRequest } from "./contracts.handler";
import { handleCatalogRequest } from "./catalog.handler";
import { handleAdminRequest } from "./admin.handler";
import { handleSubscriptionRequest } from "./subscription.handler";
import { INDONESIA_REGIONS } from "@/features/regions/regions-catalog";

function queryRegions(path: string) {
  const url = new URL(`http://localhost${path}`);
  const level = url.searchParams.get("level");
  const parentId = url.searchParams.get("parentId");
  const all = new Map<
    string,
    { id: string; name: string; level: string; parentId: string | null; province: string; regency: string }
  >();
  for (const row of INDONESIA_REGIONS) {
    all.set(`provinsi:${row.province}`, {
      ...row,
      id: row.province,
      name: row.province,
      level: "provinsi",
      parentId: null,
    });
    all.set(`kabupaten:${row.province}:${row.regency}`, {
      ...row,
      id: row.regency,
      name: row.regency,
      level: "kabupaten",
      parentId: row.province,
    });
    all.set(`kecamatan:${row.id}`, {
      ...row,
      name: row.id,
      level: "kecamatan",
      parentId: row.regency,
    });
  }
  return {
    data: Array.from(all.values()).filter(
      (r) => (!level || r.level === level) && (!parentId || r.parentId === parentId)
    ),
  };
}

/**
 * Central mock router for the SAMBUNG frontend transport layer.
 * Simulates network latency (180ms) and routes requests to mock handlers.
 */
export async function mockRouter(
  path: string,
  method: string,
  body: unknown,
  headers: Headers
): Promise<unknown> {
  // Simulasi latensi jaringan nyata (180ms)
  await new Promise((resolve) => setTimeout(resolve, 180));

  if (path.startsWith("/auth") || path.startsWith("/admin/auth")) {
    return handleAuthRequest(path, method, body);
  }

  if (path.startsWith("/admin")) {
    return handleAdminRequest(path, method, body, headers);
  }

  if (path.startsWith("/offers")) {
    return handleOfferRequest(path, method, body, headers);
  }

  if (path.startsWith("/contracts")) {
    return handleContractRequest(path, method, body, headers);
  }

  if (path.startsWith("/catalog")) {
    return handleCatalogRequest(path, method);
  }

  if (path.startsWith("/subscription")) {
    return handleSubscriptionRequest(path, method, body);
  }

  if (path.startsWith("/regions") && method === "GET") {
    return queryRegions(path);
  }

  throw new ApiError(`Rute mock '${path}' [${method}] belum diimplementasikan.`, 404, "NOT_FOUND");
}
