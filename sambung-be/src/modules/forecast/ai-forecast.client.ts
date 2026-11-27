import { fetchAiForecasts } from "../ai/ai-api.client.ts";
import { forecastPayloadSchema, type ForecastPayload } from "./forecast.types.ts";

export interface ForecastClientResult extends ForecastPayload {
  sourceMode: "live";
}

export async function fetchForecasts(
  province?: string,
  horizon?: 2 | 4,
  activeOnly = false
): Promise<ForecastClientResult> {
  const raw = await fetchAiForecasts({
    province: province?.trim() || undefined,
    horizonWeeks: horizon,
    activeOnly: activeOnly ? true : undefined,
  });
  const parsed = forecastPayloadSchema.parse(raw);
  return { ...parsed, sourceMode: "live" };
}
