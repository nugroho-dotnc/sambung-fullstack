import { z } from "zod";

export const shapFactorSchema = z.object({
  feature: z.string(),
  impact: z.number(),
  description: z.string(),
  category: z.enum(["cuaca", "kebijakan", "pasokan", "sentra", "harga_lokal"]).catch("harga_lokal"),
});

export const forecastSeriesPointSchema = z.object({
  week: z.string(),
  actualPrice: z.number().optional(),
  forecastPrice: z.number().optional(),
  lowerCi: z.number().optional(),
  upperCi: z.number().optional(),
});

export const forecastRecordSchema = z.object({
  id: z.string(),
  horizonWeeks: z.union([z.literal(2), z.literal(4)]),
  province: z.string(),
  commodity: z.string(),
  referenceDate: z.string().optional(),
  targetDate: z.string(),
  riceProducerPrice: z.number(),
  confidenceInterval80: z.tuple([z.number(), z.number()]),
  gkpEstimate: z.number(),
  gkgEstimate: z.number(),
  derivedDisclaimer: z.string().optional(),
  method: z.string(),
  isFallback: z.boolean(),
  gateMase: z.number().optional(),
  gateCoverage80Pct: z.number().optional(),
  shapContributions: z.array(shapFactorSchema),
  historicalSeries: z.array(forecastSeriesPointSchema),
});

export const forecastPayloadSchema = z.object({
  generatedAtUtc: z.string(),
  latestObservationWeek: z.string(),
  modelVersion: z.string(),
  championPerHorizon: z.record(z.string(), z.string()).optional(),
  derivedConversion: z.object({
    rGkp: z.number(),
    rGkg: z.number(),
    p50QGkp: z.number(),
    p50QGkg: z.number(),
  }),
  summary: z.record(z.string(), z.any()).optional(),
  records: z.array(forecastRecordSchema),
});

export type ForecastRecord = z.infer<typeof forecastRecordSchema>;
export type ForecastPayload = z.infer<typeof forecastPayloadSchema>;

export const forecastQuerySchema = z.object({
  province: z.string().optional(),
  horizonWeeks: z.coerce.number().pipe(z.union([z.literal(2), z.literal(4)])).optional(),
  activeOnly: z.enum(["true", "false"]).optional().transform(v => v === "true"),
});
