import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app.ts";
import { clearAiCache } from "../../src/modules/ai/ai-api.client.ts";
import { clearAiRateLimit } from "../../src/modules/ai/ai-rate-limit.ts";
import { digest } from "../../src/modules/auth/session.ts";

const ORIGIN = "http://localhost:3000";

function buildFairPriceParamsFixture() {
  return {
    generatedAtUtc: "2026-11-24T12:16:32.205117+00:00",
    updatedAt: "16 November 2026",
    formulaNote: "L_asal = P_beras * R * P10(q)",
    hppActive2026: { GKP: 6500, GKG: 8000, noRafaksi: true },
    empiricalParams: {
      GKP: {
        rendemenSkgb: 0.5338,
        p10: 0.8866,
        p50: 0.9669,
        p90: 1.0314,
        samplePairs: 689,
      },
      GKG: {
        rendemenSkgb: 0.6274,
        p10: 0.8952,
        p50: 0.9662,
        p90: 1.0328,
        samplePairs: 688,
      },
    },
    provinces: {
      Nasional: {
        province: "Nasional",
        riceReferencePrice: 14000,
        referenceSource: "PIHPS BI Nasional",
        GKP: { lowerBound: 6626, medianPrice: 7226, upperBound: 7708 },
        GKG: { lowerBound: 7863, medianPrice: 8487, upperBound: 9071 },
      },
      "Jawa Timur": {
        province: "Jawa Timur",
        riceReferencePrice: 13450,
        referenceSource: "PIHPS BI",
        GKP: { lowerBound: 6365, medianPrice: 6942, upperBound: 7405 },
        GKG: { lowerBound: 7554, medianPrice: 8154, upperBound: 8715 },
      },
      Aceh: {
        province: "Aceh",
        riceReferencePrice: 14650,
        referenceSource: "PIHPS BI",
        GKP: { lowerBound: 6934, medianPrice: 7561, upperBound: 8066 },
        GKG: { lowerBound: 8228, medianPrice: 8881, upperBound: 9492 },
      },
    },
  };
}

async function startMockAiUpstream(handler) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyText = Buffer.concat(chunks).toString("utf8");
    const parsedUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const record = {
      method: req.method ?? "GET",
      path: parsedUrl.pathname,
      search: parsedUrl.search,
      headers: req.headers,
      body: bodyText ? JSON.parse(bodyText) : null,
    };
    requests.push(record);
    await handler(record, res, requests.length);
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return { server, baseUrl, requests };
}

async function startExpressApp(db) {
  const server = createApp(db, ORIGIN).listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  async function requestJson(path, { method = "GET", cookie = "", body } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Origin: ORIGIN,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return {
      status: res.status,
      headers: res.headers,
      data: text ? JSON.parse(text) : null,
    };
  }
  return { server, baseUrl, requestJson };
}

beforeEach(() => {
  clearAiCache();
  clearAiRateLimit();
});

test("rute publik AI, proxy endpoint v1, dan validasi ketat Zod 422", async (t) => {
  const savedBaseUrl = process.env.AI_BASE_URL;
  const savedApiKey = process.env.AI_API_KEY;
  let healthReady = true;

  const upstream = await startMockAiUpstream((req, res) => {
    if (req.path === "/health") {
      res.writeHead(healthReady ? 200 : 503, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: healthReady ? "ready" : "starting",
          ready: healthReady,
          modelVersion: "sambung-predict-v1",
          apiVersion: "v1",
        })
      );
      return;
    }

    assert.equal(req.headers["x-api-key"], "mock-ai-key");

    if (req.path === "/api/v1/spatial-disparity") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          modelVersion: "sambung-predict-v1",
          provinces: [{ province: "Bali", status: "below", spatialFactors: [] }],
        })
      );
      return;
    }

    if (req.path === "/api/v1/price-board") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          comparison: {
            commodity: "Beras Medium I",
            region: "Jawa Timur",
            period: "12 Pekan Terakhir",
          },
          historicalTrends: [],
        })
      );
      return;
    }

    if (req.path === "/api/v1/fair-price/params") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildFairPriceParamsFixture()));
      return;
    }

    if (req.path === "/api/v1/fair-price/calculate") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          grainType: req.body.grainType,
          region: req.body.region,
          ricePrice: 13450,
          rendemen: req.body.rendemen ?? 0.5338,
          hppGovernment: req.body.hppGovernment ?? 6500,
          lowerBound: 6365,
          upperBound: 7405,
          medianPrice: 6942,
          referenceSource: "fixture",
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "HTTP_404", message: "Not found" } }));
  });

  process.env.AI_BASE_URL = upstream.baseUrl;
  process.env.AI_API_KEY = "mock-ai-key";

  const authToken = randomBytes(32).toString("hex");
  const authCookie = `sambung_session=${authToken}`;
  const fakeDb = {
    account: { findFirst: async () => null },
    authSession: {
      findFirst: async ({ where }) =>
        where?.tokenHash === digest(authToken)
          ? {
              account: {
                id: "u-test",
                role: "petani",
                province: "Jawa Timur",
                proExpiresAt: null,
              },
            }
          : null,
    },
    systemParameter: {
      findUnique: async () => ({
        fairPriceToleranceDelta: 0.04,
        rendemenGKP: 0.54,
        rendemenGKG: 0.63,
        governmentFloorPriceGKP: 6600,
      }),
    },
  };
  const { server, requestJson } = await startExpressApp(fakeDb);

  t.after(() => {
    server.close();
    upstream.server.close();
    clearAiCache();
    if (savedBaseUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = savedBaseUrl;
    if (savedApiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = savedApiKey;
  });

  // GET /ai/health 200 dan 503
  const healthOk = await requestJson("/ai/health");
  assert.equal(healthOk.status, 200);
  assert.equal(healthOk.data.ready, true);

  healthReady = false;
  const healthStarting = await requestJson("/ai/health");
  assert.equal(healthStarting.status, 503);
  assert.equal(healthStarting.data.status, "starting");
  assert.equal(healthStarting.data.ready, false);

  // GET /spatial-disparity + validasi ketat query asing
  const sdOk = await requestJson("/spatial-disparity?province=Bali&status=below");
  assert.equal(sdOk.status, 200);
  assert.equal(sdOk.data.provinces[0].province, "Bali");

  const hitsBeforeBadQueries = upstream.requests.length;
  const sdBad = await requestJson("/spatial-disparity?unknown=1");
  assert.equal(sdBad.status, 422);
  assert.equal(sdBad.data.code, "INVALID_INPUT");

  // GET /price-board + validasi ketat query asing / period
  const pbBadCommodity = await requestJson("/price-board?commodity=Beras%20Premium");
  assert.equal(pbBadCommodity.status, 422);
  assert.equal(pbBadCommodity.data.code, "INVALID_INPUT");

  const pbBadPeriod = await requestJson("/price-board?period=100%20Pekan");
  assert.equal(pbBadPeriod.status, 422);
  assert.equal(pbBadPeriod.data.code, "INVALID_INPUT");

  // GET /forecasts & GET /price-history tanpa sesi ditolak 401 UNAUTHENTICATED sebelum menyentuh upstream
  const fcAnon = await requestJson("/forecasts?unknownParam=1");
  assert.equal(fcAnon.status, 401);
  assert.equal(fcAnon.data.code, "UNAUTHENTICATED");

  const phAnon = await requestJson("/price-history?range=all");
  assert.equal(phAnon.status, 401);
  assert.equal(phAnon.data.code, "UNAUTHENTICATED");

  // GET /forecasts dengan sesi aktif: query asing ditolak 422 sebelum menyentuh upstream
  const fcBad = await requestJson("/forecasts?unknownParam=1", { cookie: authCookie });
  assert.equal(fcBad.status, 422);
  assert.equal(fcBad.data.code, "INVALID_INPUT");

  // GET /fair-price/params query asing ditolak 422
  const fppBad = await requestJson("/fair-price/params?foo=1");
  assert.equal(fppBad.status, 422);
  assert.equal(fppBad.data.code, "INVALID_INPUT");

  // POST /fair-price/calculate invalid body ditolak 422 sebelum menyentuh upstream
  const fpcBadExtra = await requestJson("/fair-price/calculate", {
    method: "POST",
    body: { grainType: "GKP", region: "Jawa Timur", extraField: 1 },
  });
  assert.equal(fpcBadExtra.status, 422);
  assert.equal(fpcBadExtra.data.code, "INVALID_INPUT");

  const fpcBadMoisture = await requestJson("/fair-price/calculate", {
    method: "POST",
    body: { grainType: "GKP", region: "Jawa Timur", moisturePercent: 99 },
  });
  assert.equal(fpcBadMoisture.status, 422);
  assert.equal(fpcBadMoisture.data.code, "INVALID_INPUT");

  // Pastikan seluruh permintaan 422 tidak menyentuh upstream sama sekali
  assert.equal(upstream.requests.length, hitsBeforeBadQueries);

  // GET /price-board 200 & GET /fair-price/params 200
  const pbOk = await requestJson("/price-board?region=Jawa%20Timur&period=12%20Pekan%20Terakhir");
  assert.equal(pbOk.status, 200);
  assert.equal(pbOk.data.comparison.commodity, "Beras Medium I");

  const fppOk = await requestJson("/fair-price/params");
  assert.equal(fppOk.status, 200);
  assert.equal(fppOk.data.toleranceDelta, 0.04);
  assert.equal(fppOk.data.systemParameters.governmentFloorPriceGKP, 6600);

  // POST /fair-price/calculate default dari DB dan override pemanggil
  const calcDefault = await requestJson("/fair-price/calculate", {
    method: "POST",
    body: { grainType: "GKP", region: "Jawa Timur" },
  });
  assert.equal(calcDefault.status, 200);
  assert.equal(calcDefault.data.rendemen, 0.54);
  assert.equal(calcDefault.data.hppGovernment, 6600);

  const calcOverride = await requestJson("/fair-price/calculate", {
    method: "POST",
    body: { grainType: "GKP", region: "Jawa Timur", rendemen: 0.52, hppGovernment: 6700 },
  });
  assert.equal(calcOverride.status, 200);
  assert.equal(calcOverride.data.rendemen, 0.52);
  assert.equal(calcOverride.data.hppGovernment, 6700);
});

test("overlay SystemParameter tanpa mutasi cache dan penerusan ke price-checks/preview", async (t) => {
  const savedBaseUrl = process.env.AI_BASE_URL;
  const savedApiKey = process.env.AI_API_KEY;
  let paramsHits = 0;

  const upstream = await startMockAiUpstream((req, res) => {
    if (req.path === "/api/v1/fair-price/params") {
      paramsHits += 1;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildFairPriceParamsFixture()));
      return;
    }
    if (req.path === "/api/v1/fair-price/calculate") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          grainType: req.body.grainType,
          region: req.body.region,
          ricePrice: 13450,
          rendemen: req.body.rendemen ?? 0.5338,
          lowerBound: 6365,
          upperBound: 7405,
          medianPrice: 6942,
          referenceSource: "fixture",
        })
      );
      return;
    }
    res.writeHead(404).end();
  });

  process.env.AI_BASE_URL = upstream.baseUrl;
  process.env.AI_API_KEY = "mock-ai-key";

  const makeScopedDb = (sysParam) => ({
    account: { findFirst: async () => null },
    region: {
      findUnique: async () => ({ id: "Sumbersari", province: "Jawa Timur", regency: "Jember" }),
    },
    systemParameter: {
      findUnique: async () => sysParam,
    },
  });

  const appA = await startExpressApp(
    makeScopedDb({
      fairPriceToleranceDelta: 0.05,
      rendemenGKP: 0.55,
      rendemenGKG: 0.65,
      governmentFloorPriceGKP: 6800,
    })
  );
  const appB = await startExpressApp(
    makeScopedDb({
      fairPriceToleranceDelta: 0.03,
      rendemenGKP: 0.5338,
      rendemenGKG: 0.6274,
      governmentFloorPriceGKP: 6500,
    })
  );
  const appPartial = await startExpressApp(makeScopedDb({ fairPriceToleranceDelta: 0.05 }));

  t.after(() => {
    appA.server.close();
    appB.server.close();
    appPartial.server.close();
    upstream.server.close();
    clearAiCache();
    if (savedBaseUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = savedBaseUrl;
    if (savedApiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = savedApiKey;
  });

  // Dua app memakai cache yang sama (upstream dipanggil 1x) tetapi cache tidak ikut termutasi oleh App A
  const resA = await appA.requestJson("/fair-price/params");
  const resB = await appB.requestJson("/fair-price/params");
  assert.equal(paramsHits, 1);

  assert.equal(resA.status, 200);
  assert.equal(resA.data.toleranceDelta, 0.05);
  assert.equal(resA.data.empiricalParams.GKP.rendemenSkgb, 0.55);
  assert.equal(resA.data.empiricalParams.GKG.rendemenSkgb, 0.65);
  assert.equal(resA.data.hppActive2026.GKP, 6800);
  // 14650 * 0.55 * 0.9669 = 7790.79675 -> half-up 7791
  assert.equal(resA.data.provinces.Aceh.GKP.medianPrice, 7791);

  assert.equal(resB.status, 200);
  assert.equal(resB.data.toleranceDelta, 0.03);
  assert.equal(resB.data.empiricalParams.GKP.rendemenSkgb, 0.5338);
  assert.equal(resB.data.empiricalParams.GKG.rendemenSkgb, 0.6274);
  assert.equal(resB.data.hppActive2026.GKP, 6500);
  assert.equal(resB.data.provinces.Aceh.GKP.medianPrice, 7561);

  // POST /price-checks/preview meneruskan rendemen & HPP ke /api/v1/fair-price/calculate
  const previewGkp = await appA.requestJson("/price-checks/preview", {
    method: "POST",
    body: { regionId: "Sumbersari", grainType: "GKP", quality: 22, price: 6900 },
  });
  assert.equal(previewGkp.status, 200);
  const gkpReq = upstream.requests[upstream.requests.length - 1];
  assert.equal(gkpReq.body.rendemen, 0.55);
  assert.equal(gkpReq.body.hppGovernment, 6800);

  const previewGkg = await appA.requestJson("/price-checks/preview", {
    method: "POST",
    body: { regionId: "Sumbersari", grainType: "GKG", quality: 14, price: 8100 },
  });
  assert.equal(previewGkg.status, 200);
  const gkgReq = upstream.requests[upstream.requests.length - 1];
  assert.equal(gkgReq.body.rendemen, 0.65);
  assert.equal("hppGovernment" in gkgReq.body, false);

  // Mock parsial tanpa kolom rendemen/HPP tetap aman dan deltaBp === 500
  const previewPartial = await appPartial.requestJson("/price-checks/preview", {
    method: "POST",
    body: { regionId: "Sumbersari", grainType: "GKP", quality: 22, price: 6900 },
  });
  assert.equal(previewPartial.status, 200);
  assert.equal(previewPartial.data.reference.deltaBp, 500);
  const partialReq = upstream.requests[upstream.requests.length - 1];
  assert.equal("rendemen" in partialReq.body, false);
  assert.equal("hppGovernment" in partialReq.body, false);
});

test("guard admin 401/403, observations 34 provinsi, model-evaluation, predict/live rate-limit, ingest & invalidasi cache", async (t) => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith("_test"), "Gunakan TEST_DATABASE_URL khusus uji (_test).");
  const db = new PrismaClient({ datasourceUrl: url });

  const savedBaseUrl = process.env.AI_BASE_URL;
  const savedApiKey = process.env.AI_API_KEY;
  const savedMax = process.env.AI_PREDICT_LIVE_RATE_LIMIT_MAX;
  const savedWin = process.env.AI_PREDICT_LIVE_RATE_LIMIT_WINDOW_MS;

  let paramsHits = 0;
  let predictLiveHits = 0;

  const upstream = await startMockAiUpstream((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    if (req.path === "/api/v1/fair-price/params") {
      paramsHits += 1;
      res.end(JSON.stringify(buildFairPriceParamsFixture()));
      return;
    }
    if (req.path === "/api/v1/model-evaluation") {
      res.end(
        JSON.stringify({
          modelName: "Sambung Predict",
          modelVersion: "sambung-predict-v1",
          summaryByHorizon: { "2w": { meanMase: 0.946 } },
          gateRows: [],
        })
      );
      return;
    }
    if (req.path === "/api/v1/predict/live") {
      predictLiveHits += 1;
      res.end(
        JSON.stringify({
          id: "fc-jawa-timur-2w",
          province: req.body.province,
          horizonWeeks: req.body.horizonWeeks,
          riceProducerPrice: 13520,
          liveDiagnostics: { stateless: true },
        })
      );
      return;
    }
    if (req.path === "/api/v1/admin/ingest") {
      res.end(
        JSON.stringify({
          status: "ingested",
          weekStart: req.body.weekStart,
          latestObservationWeek: req.body.weekStart,
          updatedProvincesCount: req.body.updates.length,
          updatedProvinces: req.body.updates.map((u) => u.province),
          skippedProvinces: [],
          recomputedForecastRecords: 48,
          persistedToDisk: req.body.persist ?? true,
          generatedAtUtc: "2026-11-27T00:00:00Z",
        })
      );
      return;
    }
    res.end(JSON.stringify({ ok: true }));
  });

  process.env.AI_BASE_URL = upstream.baseUrl;
  process.env.AI_API_KEY = "mock-ai-key";
  process.env.AI_PREDICT_LIVE_RATE_LIMIT_MAX = "2";
  process.env.AI_PREDICT_LIVE_RATE_LIMIT_WINDOW_MS = "60000";

  const suffix = randomUUID().slice(0, 8);
  const adminAccount = await db.account.create({
    data: {
      role: "admin",
      name: `Admin Uji ${suffix}`,
      phone: `6289${suffix}`,
      email: `admin-${suffix}@sambung.test`,
      passwordHash: digest("secret"),
      province: "Jawa Timur",
      regency: "Jember",
      district: "Sumbersari",
    },
  });
  const farmerAccount = await db.account.create({
    data: {
      role: "petani",
      name: `Petani Uji ${suffix}`,
      phone: `6288${suffix}`,
      province: "Jawa Timur",
      regency: "Jember",
      district: "Sumbersari",
    },
  });

  const adminToken = randomBytes(32).toString("hex");
  const farmerToken = randomBytes(32).toString("hex");
  await db.authSession.createMany({
    data: [
      {
        accountId: adminAccount.id,
        phone: adminAccount.phone,
        tokenHash: digest(adminToken),
        expiresAt: new Date(Date.now() + 120_000),
      },
      {
        accountId: farmerAccount.id,
        phone: farmerAccount.phone,
        tokenHash: digest(farmerToken),
        expiresAt: new Date(Date.now() + 120_000),
      },
    ],
  });
  const adminCookie = `sambung_session=${adminToken}`;
  const farmerCookie = `sambung_session=${farmerToken}`;

  const sysParamBefore = await db.systemParameter.findUnique({ where: { id: "active" } });
  const { server, requestJson } = await startExpressApp(db);

  t.after(async () => {
    server.close();
    upstream.server.close();
    clearAiCache();
    clearAiRateLimit();
    if (savedBaseUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = savedBaseUrl;
    if (savedApiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = savedApiKey;
    if (savedMax === undefined) delete process.env.AI_PREDICT_LIVE_RATE_LIMIT_MAX;
    else process.env.AI_PREDICT_LIVE_RATE_LIMIT_MAX = savedMax;
    if (savedWin === undefined) delete process.env.AI_PREDICT_LIVE_RATE_LIMIT_WINDOW_MS;
    else process.env.AI_PREDICT_LIVE_RATE_LIMIT_WINDOW_MS = savedWin;

    await db.auditLog.deleteMany({ where: { actorName: adminAccount.name } });
    if (sysParamBefore) {
      await db.systemParameter.upsert({
        where: { id: "active" },
        update: {
          orderExpiryHours: sysParamBefore.orderExpiryHours,
          fairPriceToleranceDelta: sysParamBefore.fairPriceToleranceDelta,
          rendemenGKP: sysParamBefore.rendemenGKP,
          rendemenGKG: sysParamBefore.rendemenGKG,
          governmentFloorPriceGKP: sysParamBefore.governmentFloorPriceGKP,
        },
        create: {
          id: "active",
          orderExpiryHours: sysParamBefore.orderExpiryHours,
          fairPriceToleranceDelta: sysParamBefore.fairPriceToleranceDelta,
          rendemenGKP: sysParamBefore.rendemenGKP,
          rendemenGKG: sysParamBefore.rendemenGKG,
          governmentFloorPriceGKP: sysParamBefore.governmentFloorPriceGKP,
        },
      });
    } else {
      await db.systemParameter.deleteMany({ where: { id: "active" } });
    }
    await db.authSession.deleteMany({
      where: { accountId: { in: [adminAccount.id, farmerAccount.id] } },
    });
    await db.account.deleteMany({
      where: { id: { in: [adminAccount.id, farmerAccount.id] } },
    });
    await db.$disconnect();
  });

  // 1. Tanpa sesi -> 401; sesi petani -> 403
  for (const [path, method, body] of [
    ["/admin/observations", "GET", undefined],
    ["/admin/model-evaluation", "GET", undefined],
    ["/admin/predict/live", "POST", { province: "Jawa Timur", horizonWeeks: 2 }],
    [
      "/admin/ai/ingest",
      "POST",
      { weekStart: "2026-11-23", updates: [{ province: "Aceh", producerPrice: 14500 }] },
    ],
  ]) {
    assert.equal((await requestJson(path, { method, body })).status, 401);
    assert.equal((await requestJson(path, { method, cookie: farmerCookie, body })).status, 403);
  }

  // 2. GET /admin/observations (non-hardcoded, Nasional dikeluarkan, urut alfabetis id)
  const obsRes = await requestJson("/admin/observations", { cookie: adminCookie });
  assert.equal(obsRes.status, 200);
  assert.deepEqual(
    obsRes.data.map((r) => r.province),
    ["Aceh", "Jawa Timur"]
  );
  assert.equal(obsRes.data[0].id, "obs-aceh-gkp");
  assert.equal(obsRes.data[0].price, 7561);
  assert.equal(obsRes.data[0].status, "Valid");
  assert.equal(obsRes.data[0].period, "16 November 2026");

  // 3. GET /admin/model-evaluation + query asing 422
  const evalOk = await requestJson("/admin/model-evaluation", { cookie: adminCookie });
  assert.equal(evalOk.status, 200);
  assert.equal(evalOk.data.modelVersion, "sambung-predict-v1");
  assert.equal((await requestJson("/admin/model-evaluation?foo=1", { cookie: adminCookie })).status, 422);

  // 4. POST /admin/predict/live -> stateless, validasi strict, dan rate limit 429
  const liveBadOverride = await requestJson("/admin/predict/live", {
    method: "POST",
    cookie: adminCookie,
    body: { province: "Jawa Timur", horizonWeeks: 2, overrides: { unknownShock: 1 } },
  });
  assert.equal(liveBadOverride.status, 422);
  // Perhatikan bahwa permintaan ke-1 sudah memakai kuota 1 (rate limit berjalan setelah auth)
  const liveOk = await requestJson("/admin/predict/live", {
    method: "POST",
    cookie: adminCookie,
    body: { province: "Jawa Timur", horizonWeeks: 2 },
  });
  assert.equal(liveOk.status, 200);
  assert.equal(liveOk.data.liveDiagnostics.stateless, true);
  assert.equal(predictLiveHits, 1);

  const liveLimited = await requestJson("/admin/predict/live", {
    method: "POST",
    cookie: adminCookie,
    body: { province: "Jawa Timur", horizonWeeks: 4 },
  });
  assert.equal(liveLimited.status, 429);
  assert.equal(liveLimited.data.code, "AI_RATE_LIMITED");
  assert.ok(Number(liveLimited.headers.get("retry-after")) >= 1);
  assert.equal(predictLiveHits, 1);

  // Pastikan predict/live tidak menulis AuditLog apa pun (stateless)
  const auditCountAfterPredict = await db.auditLog.count({
    where: { actorName: adminAccount.name },
  });
  assert.equal(auditCountAfterPredict, 0);

  // 5. POST /admin/ai/ingest validasi ketat (FR-031.11 + kalender) & AuditLog + clearAiCache
  const simRejected = await requestJson("/admin/ai/ingest", {
    method: "POST",
    cookie: adminCookie,
    body: {
      weekStart: "2026-11-23",
      updates: [{ province: "Aceh", producerPrice: 14500 }],
      simulatedTransaction: true,
    },
  });
  assert.equal(simRejected.status, 422);
  assert.equal(simRejected.data.code, "INVALID_INPUT");

  const dateRejected = await requestJson("/admin/ai/ingest", {
    method: "POST",
    cookie: adminCookie,
    body: {
      weekStart: "2026-02-31",
      updates: [{ province: "Aceh", producerPrice: 14500 }],
    },
  });
  assert.equal(dateRejected.status, 422);
  assert.equal(dateRejected.data.code, "INVALID_INPUT");

  assert.equal(paramsHits, 1);
  const dryRun = await requestJson("/admin/ai/ingest", {
    method: "POST",
    cookie: adminCookie,
    body: {
      weekStart: "2026-11-23",
      persist: false,
      updates: [{ province: "Aceh", producerPrice: 14500 }],
    },
  });
  assert.equal(dryRun.status, 200);
  // Cache dibersihkan -> pemanggilan /fair-price/params berikutnya kembali ke upstream
  assert.equal((await requestJson("/fair-price/params")).status, 200);
  assert.equal(paramsHits, 2);

  const liveIngest = await requestJson("/admin/ai/ingest", {
    method: "POST",
    cookie: adminCookie,
    body: {
      weekStart: "2026-11-30",
      persist: true,
      updates: [{ province: "Jawa Timur", producerPrice: 13550 }],
    },
  });
  assert.equal(liveIngest.status, 200);

  const ingestLogs = await db.auditLog.findMany({
    where: { actorName: adminAccount.name },
    orderBy: { timestamp: "asc" },
  });
  assert.equal(ingestLogs[0].action, "AI_INGEST_DRY_RUN");
  assert.equal(ingestLogs[1].action, "AI_INGEST_WEEKLY");

  // 6. POST /admin/parameters (validasi domain + clear cache) & POST /admin/observations/publish
  assert.equal(
    (
      await requestJson("/admin/parameters", {
        method: "POST",
        cookie: adminCookie,
        body: { rendemenGKP: 53.38 },
      })
    ).status,
    422
  );

  // Prime cache /fair-price/params (paramsHits menjadi 3)
  assert.equal((await requestJson("/fair-price/params")).status, 200);
  assert.equal(paramsHits, 3);

  assert.equal(
    (
      await requestJson("/admin/parameters", {
        method: "POST",
        cookie: adminCookie,
        body: { rendemenGKP: 0.55 },
      })
    ).status,
    200
  );
  // Cache dibersihkan -> hits menjadi 4
  assert.equal((await requestJson("/fair-price/params")).status, 200);
  assert.equal(paramsHits, 4);

  assert.equal(
    (await requestJson("/admin/observations/publish", { method: "POST", cookie: adminCookie, body: {} }))
      .status,
    200
  );
  // Cache dibersihkan -> hits menjadi 5
  assert.equal((await requestJson("/fair-price/params")).status, 200);
  assert.equal(paramsHits, 5);
});

test("smoke test baca-saja live rute AI baru terhadap Hugging Face Space asli", async (t) => {
  const fakeDb = {
    account: { findFirst: async () => null },
    systemParameter: { findUnique: async () => null },
  };
  const { server, requestJson } = await startExpressApp(fakeDb);
  t.after(() => server.close());

  const health = await requestJson("/ai/health");
  assert.equal(health.status, 200);
  assert.equal(health.data.ready, true);

  const spatial = await requestJson("/spatial-disparity?province=Bali");
  assert.equal(spatial.status, 200);
  assert.equal(spatial.data.provinces[0].province, "Bali");

  const board = await requestJson("/price-board?region=Jawa%20Timur&period=12%20Pekan%20Terakhir");
  assert.equal(board.status, 200);
  assert.equal(board.data.comparison.commodity, "Beras Medium I");

  const params = await requestJson("/fair-price/params");
  assert.equal(params.status, 200);
  assert.ok(params.data.hppActive2026);
  assert.ok(params.data.systemParameters);

  const calc = await requestJson("/fair-price/calculate", {
    method: "POST",
    body: { grainType: "GKP", region: "Jawa Timur", moisturePercent: 22 },
  });
  assert.equal(calc.status, 200);
  assert.ok(calc.data.lowerBound > 0);
  assert.ok(calc.data.upperBound >= calc.data.lowerBound);
});
