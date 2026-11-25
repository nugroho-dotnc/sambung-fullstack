import { ApiError } from "@/lib/api/errors";
import { handleAuthRequest } from "./auth.handler";
import { handleOfferRequest } from "./offers";
import { handleContractRequest } from "./contracts.handler";
import { handleCatalogRequest } from "./catalog.handler";
import { handleAdminRequest } from "./admin.handler";

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

  throw new ApiError(`Rute mock '${path}' [${method}] belum diimplementasikan.`, 404, "NOT_FOUND");
}
