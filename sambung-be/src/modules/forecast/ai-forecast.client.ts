import { readFile } from "node:fs/promises";
import { z } from "zod";
import { ApiError } from "../../shared/api-error.ts";
import { forecastPayloadSchema, type ForecastPayload } from "./forecast.types.ts";

export interface ForecastClientResult extends ForecastPayload {
  sourceMode: "live" | "snapshot";
}

export async function fetchForecasts(
  province?: string,
  horizon?: 2 | 4,
  activeOnly = false
): Promise<ForecastClientResult> {
  const base = process.env.AI_BASE_URL || "https://rizsd21-sambung-ai-api.hf.space";
  const url = `${base}/gradio_api/call/api_forecasts`;
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 15000);
  const signal = AbortSignal.timeout(timeoutMs);

  try {
    const start = await fetch(url, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [province || "", horizon || 0, activeOnly] }),
    });

    if (!start.ok) throw new Error(`HTTP ${start.status} saat memicu api_forecasts`);

    const { event_id } = z.object({ event_id: z.string().min(1) }).parse(await start.json());
    const response = await fetch(`${url}/${encodeURIComponent(event_id)}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} saat membaca hasil api_forecasts`);

    const text = (await response.text()).replaceAll("\r", "");
    const event = text.split("\n\n").find((block) => block.split("\n").includes("event: complete"));
    const line = event?.split("\n").find((row) => row.startsWith("data:"));
    if (!line) throw new Error("Gagal menerima stream event api_forecasts");

    const [value] = JSON.parse(line.slice(5));
    const rawObj = typeof value === "string" ? JSON.parse(value) : value;
    const parsed = forecastPayloadSchema.parse(rawObj);

    return { ...parsed, sourceMode: "live" };
  } catch (err) {
    // Fallback ke snapshot lokal
    const snapshotPath =
      process.env.AI_FORECAST_SNAPSHOT_PATH || "../sambung-fe/data/ai/forecast_produsen.json";

    try {
      const snapshotText = await readFile(snapshotPath, "utf8");
      const rawSnapshot = JSON.parse(snapshotText);
      const parsed = forecastPayloadSchema.parse(rawSnapshot);

      let filteredRecords = parsed.records;
      if (province) {
        filteredRecords = filteredRecords.filter(
          (r) => r.province.toLowerCase() === province.toLowerCase()
        );
      }
      if (horizon) {
        filteredRecords = filteredRecords.filter((r) => r.horizonWeeks === horizon);
      }
      if (activeOnly) {
        filteredRecords = filteredRecords.filter((r) => !r.isFallback);
      }

      return {
        ...parsed,
        records: filteredRecords,
        sourceMode: "snapshot",
      };
    } catch {
      throw new ApiError(
        503,
        "FORECAST_UNAVAILABLE",
        "Prakiraan harga AI belum tersedia saat ini. Silakan coba kembali beberapa saat lagi."
      );
    }
  }
}
