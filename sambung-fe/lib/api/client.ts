import { z } from "zod";
import { ApiError } from "./errors";

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  json?: unknown;
};

// Services validate successful responses with their feature schema.
export async function apiClient(
  path: string,
  { json, headers, ...options }: ApiRequestOptions = {},
): Promise<unknown> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("API path must start with a single slash.");
  }

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (json !== undefined) requestHeaders.set("Content-Type", "application/json");

  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    options.signal?.throwIfAborted();
    const { mockRouter } = await import("@/mock/server/router");
    options.signal?.throwIfAborted();
    return mockRouter(path, (options.method ?? "GET").toUpperCase(), json, requestHeaders);
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      credentials: "include",
      ...options,
      headers: requestHeaders,
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError("Tidak dapat terhubung ke layanan.", 0, "NETWORK_ERROR");
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    throw new ApiError("Respons layanan tidak valid.", response.status, "INVALID_RESPONSE");
  }

  if (!response.ok) {
    const result = errorSchema.safeParse(payload);
    const retryAfterRaw = response.headers.get("retry-after");
    const retryAfterParsed = retryAfterRaw !== null && retryAfterRaw.trim() !== "" ? Number(retryAfterRaw) : NaN;
    const retryAfterSeconds = Number.isFinite(retryAfterParsed) && retryAfterParsed > 0 ? retryAfterParsed : undefined;
    throw new ApiError(
      result.success ? result.data.message : "Permintaan gagal diproses.",
      response.status,
      result.success ? result.data.code : "HTTP_ERROR",
      result.success ? result.data.fieldErrors : undefined,
      retryAfterSeconds,
    );
  }
  return payload;
}

apiClient.get = async <T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  return apiClient(path, { ...options, method: "GET" }) as Promise<T>;
};

apiClient.post = async <T = unknown>(path: string, json?: unknown, options: ApiRequestOptions = {}): Promise<T> => {
  return apiClient(path, { ...options, method: "POST", json }) as Promise<T>;
};

apiClient.patch = async <T = unknown>(path: string, json?: unknown, options: ApiRequestOptions = {}): Promise<T> => {
  return apiClient(path, { ...options, method: "PATCH", json }) as Promise<T>;
};

apiClient.delete = async <T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  return apiClient(path, { ...options, method: "DELETE" }) as Promise<T>;
};
