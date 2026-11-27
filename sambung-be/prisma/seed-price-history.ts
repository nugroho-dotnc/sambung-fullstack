import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

const positiveNullableInt = z.number().int().positive().nullable();

const seedRowSchema = z.object({
  region: z.string().min(1),
  commodity: z.string().min(1).default("Beras Medium I"),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  farmerPrice: positiveNullableInt.optional(),
  millerPrice: positiveNullableInt.optional(),
  wholesalePrice: positiveNullableInt.optional(),
  retailPrice: positiveNullableInt.optional(),
  modernPrice: positiveNullableInt.optional(),
});

const seedTupleSchema = z.tuple([
  z.string().min(1),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  positiveNullableInt,
  positiveNullableInt,
  positiveNullableInt,
  positiveNullableInt,
  positiveNullableInt,
]);

const compactSeedPayloadSchema = z.object({
  commodity: z.string().min(1),
  columns: z.array(z.string()).length(7),
  rows: z.array(seedTupleSchema),
});

const seedPayloadSchema = z.union([
  compactSeedPayloadSchema,
  z.array(seedRowSchema),
]);

interface NormalizedSeedRow {
  region: string;
  commodity: string;
  weekStart: string;
  farmerPrice: number | null;
  millerPrice: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  modernPrice: number | null;
}

const CHUNK_SIZE = 500;

const DEFAULT_SEED_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "data",
  "pihps_all_provinces_2019_2026.json"
);

function normalizeSeedRows(raw: unknown): NormalizedSeedRow[] {
  const parsed = seedPayloadSchema.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => ({
      region: item.region,
      commodity: item.commodity,
      weekStart: item.weekStart,
      farmerPrice: item.farmerPrice ?? null,
      millerPrice: item.millerPrice ?? null,
      wholesalePrice: item.wholesalePrice ?? null,
      retailPrice: item.retailPrice ?? null,
      modernPrice: item.modernPrice ?? null,
    }));
  }
  return parsed.rows.map(([region, weekStart, farmerPrice, millerPrice, wholesalePrice, retailPrice, modernPrice]) => ({
    region,
    commodity: parsed.commodity,
    weekStart,
    farmerPrice,
    millerPrice,
    wholesalePrice,
    retailPrice,
    modernPrice,
  }));
}

/**
 * Idempotently seeds weekly PIHPS BI market price history while preserving any stored AI predictions.
 */
export async function seedPriceHistoryFromFile(
  db: PrismaClient,
  jsonPath: string = DEFAULT_SEED_PATH
): Promise<{
  count: number;
  regionsCount: number;
  firstWeek: string | null;
  lastWeek: string | null;
}> {
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as unknown;
  const rows = normalizeSeedRows(raw);

  if (rows.length === 0) {
    return { count: 0, regionsCount: 0, firstWeek: null, lastWeek: null };
  }

  for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
    const chunk = rows.slice(offset, offset + CHUNK_SIZE);
    const values = chunk.map(
      (item) => Prisma.sql`(
        CAST(${randomUUID()} AS UUID),
        ${item.region},
        ${item.commodity},
        CAST(${item.weekStart} AS DATE),
        CAST(${item.farmerPrice} AS INTEGER),
        CAST(${item.millerPrice} AS INTEGER),
        CAST(${item.wholesalePrice} AS INTEGER),
        CAST(${item.retailPrice} AS INTEGER),
        CAST(${item.modernPrice} AS INTEGER),
        'pihps_bi',
        NOW(),
        NOW()
      )`
    );

    await db.$executeRaw(Prisma.sql`
      INSERT INTO "market_price_history" (
        "id",
        "region",
        "commodity",
        "week_start",
        "farmer_price",
        "miller_price",
        "wholesale_price",
        "retail_price",
        "modern_price",
        "source",
        "created_at",
        "updated_at"
      )
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("region", "commodity", "week_start")
      DO UPDATE SET
        "farmer_price" = EXCLUDED."farmer_price",
        "miller_price" = EXCLUDED."miller_price",
        "wholesale_price" = EXCLUDED."wholesale_price",
        "retail_price" = EXCLUDED."retail_price",
        "modern_price" = EXCLUDED."modern_price",
        "source" = EXCLUDED."source",
        "updated_at" = NOW()
    `);
  }

  let firstWeek: string | null = null;
  let lastWeek: string | null = null;
  const regions = new Set<string>();
  for (const row of rows) {
    regions.add(row.region);
    if (firstWeek === null || row.weekStart < firstWeek) firstWeek = row.weekStart;
    if (lastWeek === null || row.weekStart > lastWeek) lastWeek = row.weekStart;
  }

  return {
    count: rows.length,
    regionsCount: regions.size,
    firstWeek,
    lastWeek,
  };
}

const isCliEntry =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isCliEntry) {
  const db = new PrismaClient();
  try {
    const result = await seedPriceHistoryFromFile(db);
    console.log(
      `Seeded ${result.count} market_price_history rows across ${result.regionsCount} regions (${result.firstWeek} -> ${result.lastWeek}).`
    );
  } finally {
    await db.$disconnect();
  }
}
