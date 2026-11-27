/**
 * Domain models for AI price forecasts & TreeSHAP factor explanations.
 * Backed live by GET /forecasts & GET /forecasts/meta.
 */

export type ShapCategory = "cuaca" | "kebijakan" | "pasokan" | "sentra" | "harga_lokal";

export interface ShapFactor {
  feature: string;
  impact: number; // positive = pushes forecast up, negative = restrains forecast, 0 = neutral
  description: string;
  category: ShapCategory;
}

export interface ForecastSeriesPoint {
  week: string;
  actualPrice?: number;
  forecastPrice?: number;
  lowerCi?: number;
  upperCi?: number;
}

export interface ForecastRecord {
  id: string;
  horizonWeeks: 2 | 4;
  province: string;
  commodity: string;
  referenceDate?: string;
  targetDate: string;
  riceProducerPrice: number;
  confidenceInterval80: [number, number];
  gkpEstimate: number;
  gkgEstimate: number;
  derivedDisclaimer?: string;
  method: string;
  isFallback: boolean;
  gateMase?: number;
  gateCoverage80Pct?: number;
  shapContributions: ShapFactor[];
  historicalSeries: ForecastSeriesPoint[];
}
