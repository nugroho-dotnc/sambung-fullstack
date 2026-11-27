import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app.ts";
import { seedPriceHistoryFromFile } from "../../prisma/seed-price-history.ts";
import { clearAiCache } from "../../src/modules/ai/ai-api.client.ts";
import { clearPriceHistoryCache } from "../../src/modules/ai/price-history.service.ts";
import { digest } from "../../src/modules/auth/session.ts";

const ORIGIN = "http://localhost:3000";

test("Price History (PIHPS BI 2019-2026 All 35 Regions + AI Forecast + Admin Ingest Preservation)", async (t) => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith("_test"));
  const db = new PrismaClient({ datasourceUrl: url });

  const savedBaseUrl = process.env.AI_BASE_URL;
  const savedApiKey = process.env.AI_API_KEY;
  clearAiCache();
  clearPriceHistoryCache();

  let forecastCalls = 0;
  const ingestCalls = [];
  const aiServer = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const bodyText = Buffer.concat(chunks).toString("utf8");
    const body = bodyText ? JSON.parse(bodyText) : null;
    const parsedUrl = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.headers["x-api-key"] !== "test-ai-key") {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid key" } }));
    }

    if (req.method === "GET" && parsedUrl.pathname === "/api/v1/forecasts") {
      forecastCalls += 1;
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          generatedAtUtc: "2026-11-27T06:39:31+00:00",
          latestObservationWeek: "2026-11-16",
          modelName: "Sambung Predict",
          modelVersion: "sambung-predict-v1",
          records: [
            {
              id: "fc-jawa-timur-2w",
              horizonWeeks: 2,
              province: "Jawa Timur",
              referenceDateIso: "2026-11-16",
              targetDateIso: "2026-11-30",
              riceProducerPrice: 13450,
              confidenceInterval80: [13415, 13480],
              gkpEstimate: 6942,
              method: "Mode AI",
            },
            {
              id: "fc-jawa-timur-4w",
              horizonWeeks: 4,
              province: "Jawa Timur",
              referenceDateIso: "2026-11-16",
              targetDateIso: "2026-12-14",
              riceProducerPrice: 13446,
              confidenceInterval80: [13351, 13545],
              gkpEstimate: 6940,
              method: "Mode AI",
            },
          ],
        })
      );
    }

    if (req.method === "POST" && parsedUrl.pathname === "/api/v1/admin/ingest") {
      ingestCalls.push(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          ok: true,
          persisted: body?.persist !== false,
          weekStart: body?.weekStart,
          updatedProvincesCount: body?.updates?.length ?? 0,
        })
      );
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Unknown path" } }));
  }).listen(0, "127.0.0.1");
  await once(aiServer, "listening");

  process.env.AI_BASE_URL = `http://127.0.0.1:${aiServer.address().port}`;
  process.env.AI_API_KEY = "test-ai-key";

  const app = createApp(db, ORIGIN).listen(0, "127.0.0.1");
  await once(app, "listening");
  const baseAppUrl = `http://127.0.0.1:${app.address().port}`;

  t.after(async () => {
    clearAiCache();
    clearPriceHistoryCache();
    app.close();
    aiServer.close();
    if (savedBaseUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = savedBaseUrl;
    if (savedApiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = savedApiKey;
    await db.$disconnect();
  });

  // Start clean and verify idempotent double seeding produces exact 14,384 rows across 35 regions
  await db.marketPriceHistory.deleteMany({});
  const seed1 = await seedPriceHistoryFromFile(db);
  const seed2 = await seedPriceHistoryFromFile(db);
  assert.equal(seed1.count, 14384);
  assert.equal(seed2.count, 14384);
  assert.equal(seed1.regionsCount, 35);
  assert.equal(await db.marketPriceHistory.count(), 14384);
  assert.equal(await db.marketPriceHistory.count({ where: { region: "Jawa Timur" } }), 411);

  async function reqJson(path, { method = "GET", cookie = "", body } = {}) {
    const res = await fetch(`${baseAppUrl}${path}`, {
      method,
      headers: {
        Origin: ORIGIN,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  }

  // Create admin test session for authenticated price-history & ingest assertions
  const adminAccount = await db.account.create({
    data: {
      name: "Admin Price Test",
      role: "admin",
      phone: randomUUID(),
      email: `admin-ph-${randomUUID().slice(0, 8)}@sambung.id`,
      passwordHash: digest("secret"),
      province: "Jawa Timur",
      regency: "Jember",
      district: "Sumbersari",
    },
  });
  const token = randomBytes(32).toString("hex");
  await db.authSession.create({
    data: {
      phone: adminAccount.phone,
      accountId: adminAccount.id,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + 120_000),
    },
  });
  const adminCookie = `sambung_session=${token}`;

  // Unauthenticated access must be rejected with 401 UNAUTHENTICATED
  const anonRes = await reqJson("/price-history?region=Jawa%20Timur&range=12w");
  assert.equal(anonRes.status, 401);
  assert.equal(anonRes.data.code, "UNAUTHENTICATED");

  // Strict query validation -> 422
  const invalidQuery = await reqJson("/price-history?unknown=1", { cookie: adminCookie });
  const invalidQuery = await reqJson("/price-history?unknown=1", { cookie: adminCookie });
  assert.equal(invalidQuery.status, 422);

  // 12w range auto-syncs +2w & +4w prediction rows -> 12 actual + 2 predicted = 14 rows
  const res12w = await reqJson("/price-history?region=Jawa%20Timur&range=12w", { cookie: adminCookie });
  const res12w = await reqJson("/price-history?region=Jawa%20Timur&range=12w", { cookie: adminCookie });
  assert.equal(res12w.status, 200);
  assert.equal(res12w.data.actualCount, 411);
  assert.equal(res12w.data.predictionCount, 2);
  assert.equal(res12w.data.hasFullHistory, true);
  assert.equal(res12w.data.coveredRegions.length, 35);
  assert.ok(res12w.data.coveredRegions.includes("Jawa Timur"));
  assert.ok(res12w.data.coveredRegions.includes("Nasional"));
  assert.ok(res12w.data.coveredRegions.includes("DKI Jakarta"));
  assert.ok(res12w.data.coveredRegions.includes("Papua"));
  assert.equal(res12w.data.latestActualWeek, "2026-11-16");
  assert.equal(res12w.data.rows.length, 14);

  const nov16 = res12w.data.rows.find((r) => r.weekStart === "2026-11-16");
  assert.equal(nov16.rowStatus, "actual");
  assert.equal(nov16.farmerPrice, 13005);
  assert.equal(nov16.millerPrice, 13450);
  assert.equal(nov16.wholesalePrice, 14950);
  assert.equal(nov16.retailPrice, 15250);

  const nov30 = res12w.data.rows.find((r) => r.weekStart === "2026-11-30");
  assert.equal(nov30.rowStatus, "predicted");
  assert.equal(nov30.wholesalePrice, null);
  assert.equal(nov30.retailPrice, null);
  assert.equal(nov30.predictedMillerPrice, 13450);
  assert.equal(nov30.predictedFarmerPrice, 13005);
  assert.equal(nov30.predictionHorizonWeeks, 2);

  // range=all returns all 413 rows (411 actual + 2 predicted) and years 2026..2019
  const resAll = await reqJson("/price-history?region=Jawa%20Timur&range=all", { cookie: adminCookie });
  const resAll = await reqJson("/price-history?region=Jawa%20Timur&range=all", { cookie: adminCookie });
  assert.equal(resAll.status, 200);
  assert.equal(resAll.data.rows.length, 413);
  assert.deepEqual(resAll.data.availableYears, [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019]);

  // Year filter (2025) & status=predicted filter
  const res2025 = await reqJson("/price-history?region=Jawa%20Timur&range=2025", { cookie: adminCookie });
  const res2025 = await reqJson("/price-history?region=Jawa%20Timur&range=2025", { cookie: adminCookie });
  assert.equal(res2025.status, 200);
  assert.ok(res2025.data.rows.length >= 52);
  assert.ok(res2025.data.rows.every((r) => r.year === 2025));

  const resPredOnly = await reqJson("/price-history?region=Jawa%20Timur&range=all&status=predicted", {
    cookie: adminCookie,
  });
  const resPredOnly = await reqJson("/price-history?region=Jawa%20Timur&range=all&status=predicted", {
    cookie: adminCookie,
  });
  assert.equal(resPredOnly.status, 200);
  assert.equal(resPredOnly.data.rows.length, 2);
  assert.equal(forecastCalls, 1);

  // Verify Nasional and non-producer province (DKI Jakarta) parity on latest week
  const resNasional = await reqJson("/price-history?region=Nasional&range=12w", { cookie: adminCookie });
  const resNasional = await reqJson("/price-history?region=Nasional&range=12w", { cookie: adminCookie });
  assert.equal(resNasional.status, 200);
  assert.equal(resNasional.data.hasFullHistory, true);
  assert.equal(resNasional.data.actualCount, 411);
  const nasLatest = resNasional.data.rows.find((r) => r.weekStart === "2026-11-16");
  assert.equal(nasLatest.farmerPrice, 13633);
  assert.equal(nasLatest.millerPrice, 14100);
  assert.equal(nasLatest.wholesalePrice, 15670);
  assert.equal(nasLatest.retailPrice, 16730);

  const resJakarta = await reqJson("/price-history?region=DKI%20Jakarta&range=12w", { cookie: adminCookie });
  const resJakarta = await reqJson("/price-history?region=DKI%20Jakarta&range=12w", { cookie: adminCookie });
  assert.equal(resJakarta.status, 200);
  assert.equal(resJakarta.data.hasFullHistory, true);
  assert.equal(resJakarta.data.actualCount, 411);
  const jktLatest = resJakarta.data.rows.find((r) => r.weekStart === "2026-11-16");
  assert.equal(jktLatest.farmerPrice, 14540);
  assert.equal(jktLatest.millerPrice, 15038);
  assert.equal(jktLatest.wholesalePrice, 15200);
  assert.equal(jktLatest.retailPrice, 17050);

  const dryRun = await reqJson("/admin/ai/ingest", {
    method: "POST",
    cookie: adminCookie,
    body: {
      weekStart: "2026-11-30",
      persist: false,
      updates: [
        {
          province: "Jawa Timur",
          producerPrice: 13600,
          wholesalePrice: 15050,
          retailPrice: 15350,
        },
      ],
    },
  });
  assert.equal(dryRun.status, 200);
  const nov30AfterDry = await reqJson("/price-history?region=Jawa%20Timur&range=12w", {
    cookie: adminCookie,
  });
  assert.equal(nov30AfterDry.data.rows.find((r) => r.weekStart === "2026-11-30").rowStatus, "predicted");

  const persisted = await reqJson("/admin/ai/ingest", {
    method: "POST",
    cookie: adminCookie,
    body: {
      weekStart: "2026-11-30",
      persist: true,
      updates: [
        {
          province: "Jawa Timur",
          producerPrice: 13600,
          wholesalePrice: 15050,
          retailPrice: 15350,
        },
      ],
    },
  });
  assert.equal(persisted.status, 200);

  const afterIngest = await reqJson("/price-history?region=Jawa%20Timur&range=12w", {
    cookie: adminCookie,
  });
  const mergedNov30 = afterIngest.data.rows.find((r) => r.weekStart === "2026-11-30");
  assert.equal(mergedNov30.rowStatus, "actual_with_prediction");
  assert.equal(mergedNov30.source, "admin_ingest");
  assert.equal(mergedNov30.millerPrice, 13600);
  assert.equal(mergedNov30.predictedMillerPrice, 13450);
  assert.equal(mergedNov30.predictionErrorRp, 150);
  assert.equal(mergedNov30.wholesalePrice, 15050);
  assert.equal(mergedNov30.retailPrice, 15350);
});
