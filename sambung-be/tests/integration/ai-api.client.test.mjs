import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import express from "express";
import {
  clearAiCache,
  fetchAiHealth,
  fetchAiForecasts,
  fetchAiSpatialDisparity,
  fetchAiPriceBoard,
  fetchAiFairPriceParams,
  fetchAiModelEvaluation,
  calculateAiFairPrice,
  predictAiLive,
  ingestAiWeeklyPrices,
  warmUpAi,
} from "../../src/modules/ai/ai-api.client.ts";
import { ApiError } from "../../src/shared/api-error.ts";
import { errorHandler } from "../../src/middleware/error-handler.ts";

let savedBaseUrl;
let savedApiKey;
let savedTimeout;

beforeEach(() => {
  savedBaseUrl = process.env.AI_BASE_URL;
  savedApiKey = process.env.AI_API_KEY;
  savedTimeout = process.env.AI_TIMEOUT_MS;
  clearAiCache();
});

afterEach(() => {
  clearAiCache();
  if (savedBaseUrl === undefined) delete process.env.AI_BASE_URL;
  else process.env.AI_BASE_URL = savedBaseUrl;
  if (savedApiKey === undefined) delete process.env.AI_API_KEY;
  else process.env.AI_API_KEY = savedApiKey;
  if (savedTimeout === undefined) delete process.env.AI_TIMEOUT_MS;
  else process.env.AI_TIMEOUT_MS = savedTimeout;
});

async function startMockServer(handler) {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const bodyText = Buffer.concat(chunks).toString("utf8");
    const url = new URL(req.url, "http://127.0.0.1");
    const record = {
      method: req.method,
      path: url.pathname,
      search: url.search,
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

test("config dinamis: base URL / API key kosong menghasilkan 503 AI_NOT_CONFIGURED", async (t) => {
  const { server, baseUrl, requests } = await startMockServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ready", ready: true }));
  });
  t.after(() => server.close());

  delete process.env.AI_BASE_URL;
  delete process.env.AI_API_KEY;

  await assert.rejects(
    () => fetchAiHealth(),
    (err) => err instanceof ApiError && err.status === 503 && err.code === "AI_NOT_CONFIGURED"
  );

  // Trailing slash dinormalisasi dan /health bekerja tanpa API key
  process.env.AI_BASE_URL = `${baseUrl}///`;
  const health = await fetchAiHealth();
  assert.equal(health.httpStatus, 200);
  assert.equal(health.data.ready, true);
  assert.equal(requests[0].headers["x-api-key"], undefined);

  // Endpoint /api/v1/* wajib AI_API_KEY
  await assert.rejects(
    () => fetchAiForecasts(),
    (err) => err instanceof ApiError && err.status === 503 && err.code === "AI_NOT_CONFIGURED"
  );
});

test("seluruh 9 endpoint mengirim metode, path, query, dan header X-API-Key sesuai kontrak", async (t) => {
  const { server, baseUrl, requests } = await startMockServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    if (req.path === "/health") {
      res.end(JSON.stringify({ status: "ready", ready: true, modelVersion: "sambung-predict-v1" }));
      return;
    }
    res.end(JSON.stringify({ ok: true, path: req.path, body: req.body }));
  });
  t.after(() => server.close());

  process.env.AI_BASE_URL = baseUrl;
  process.env.AI_API_KEY = "secret-test-key";

  await fetchAiHealth();
  await fetchAiForecasts({ province: "Aceh", horizonWeeks: 2, activeOnly: true });
  await fetchAiSpatialDisparity({ province: "Bali", status: "below" });
  await fetchAiPriceBoard({ region: "Jawa Timur", period: "12 Pekan Terakhir" });
  await fetchAiFairPriceParams();
  await fetchAiModelEvaluation();
  await calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur", moisturePercent: 22 });
  await predictAiLive({ province: "Jawa Timur", horizonWeeks: 4, forceAi: true });
  await ingestAiWeeklyPrices({
    weekStart: "2026-11-23",
    persist: true,
    updates: [{ province: "Jawa Timur", producerPrice: 13500 }],
  });

  assert.equal(requests.length, 9);
  assert.deepEqual(
    requests.map((r) => `${r.method} ${r.path}${r.search}`),
    [
      "GET /health",
      "GET /api/v1/forecasts?activeOnly=true&horizonWeeks=2&province=Aceh",
      "GET /api/v1/spatial-disparity?province=Bali&status=below",
      "GET /api/v1/price-board?period=12+Pekan+Terakhir&region=Jawa+Timur",
      "GET /api/v1/fair-price/params",
      "GET /api/v1/model-evaluation",
      "POST /api/v1/fair-price/calculate",
      "POST /api/v1/predict/live",
      "POST /api/v1/admin/ingest",
    ]
  );

  assert.equal(requests[0].headers["x-api-key"], undefined);
  for (const r of requests.slice(1)) {
    assert.equal(r.headers["x-api-key"], "secret-test-key");
  }
});

test("cache TTL 60s, clone anti-mutasi, isolasi 2 baseUrl, dan dedupe in-flight", async (t) => {
  const serverA = await startMockServer(async (req, res, seq) => {
    await new Promise((r) => setTimeout(r, 30));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ source: "A", seq, nested: { value: seq } }));
  });
  const serverB = await startMockServer((req, res, seq) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ source: "B", seq, nested: { value: seq } }));
  });
  t.after(() => {
    serverA.server.close();
    serverB.server.close();
  });

  t.mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
  process.env.AI_BASE_URL = serverA.baseUrl;
  process.env.AI_API_KEY = "key-a";

  // Dedupe in-flight: 3 request serentak hanya memicu 1 request upstream
  const [c1, c2, c3] = await Promise.all([
    fetchAiForecasts({ province: "Aceh" }),
    fetchAiForecasts({ province: "Aceh" }),
    fetchAiForecasts({ province: "Aceh" }),
  ]);
  assert.equal(serverA.requests.length, 1);
  c1.nested.value = 9999; // Mutasi caller tidak boleh merusak c2 atau cache
  assert.equal(c2.nested.value, 1);
  assert.equal(c3.nested.value, 1);

  // Cache hit dalam 60s
  t.mock.timers.tick(59_000);
  const hit = await fetchAiForecasts({ province: "Aceh" });
  assert.equal(hit.nested.value, 1);
  assert.equal(serverA.requests.length, 1);

  // Dua baseUrl berbeda tidak berbagi cache
  process.env.AI_BASE_URL = serverB.baseUrl;
  const fromB = await fetchAiForecasts({ province: "Aceh" });
  assert.equal(fromB.source, "B");
  assert.equal(serverB.requests.length, 1);

  // Kembali ke server A dan lewati TTL 60s -> cache miss
  process.env.AI_BASE_URL = serverA.baseUrl;
  t.mock.timers.tick(2_000);
  const refreshed = await fetchAiForecasts({ province: "Aceh" });
  assert.equal(refreshed.seq, 2);
  assert.equal(serverA.requests.length, 2);
});

test("stale-if-error (<10 menit disajikan + warning, >10 menit gagal) dan clearAiCache", async (t) => {
  let failUpstream = false;
  const { server, baseUrl, requests } = await startMockServer((req, res) => {
    if (failUpstream) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "internal detail" } }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ cachedValue: 42 }));
  });
  t.after(() => server.close());

  t.mock.timers.enable({ apis: ["Date"], now: 2_000_000 });
  process.env.AI_BASE_URL = baseUrl;
  process.env.AI_API_KEY = "k1";

  const warnLogs = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnLogs.push(args.join(" "));
  t.after(() => {
    console.warn = origWarn;
  });

  // Prime cache
  const initial = await fetchAiFairPriceParams();
  assert.equal(initial.cachedValue, 42);
  assert.equal(requests.length, 1);

  // TTL lewat (>60s), upstream gagal, umur cache 2 menit (<10 menit) -> layani stale + log warning
  failUpstream = true;
  t.mock.timers.tick(120_000);
  const staleRes = await fetchAiFairPriceParams();
  assert.equal(staleRes.cachedValue, 42);
  assert.equal(requests.length, 2);
  assert.ok(warnLogs.some((msg) => msg.includes("cache stale") && msg.includes("/api/v1/fair-price/params")));

  // Umur cache > 10 menit -> tolak stale dan lempar error 503
  t.mock.timers.tick(9 * 60_000);
  await assert.rejects(
    () => fetchAiFairPriceParams(),
    (err) => err instanceof ApiError && err.status === 503 && err.code === "AI_SERVICE_UNAVAILABLE"
  );

  // Pastikan error juga tidak pernah meng-cache dirinya sendiri
  failUpstream = false;
  const recovered = await fetchAiFairPriceParams();
  assert.equal(recovered.cachedValue, 42);
  assert.equal(requests.length, 4);
});

test("endpoint non-cache tidak pernah masuk cache dan ingest membersihkan cache baca", async (t) => {
  const { server, baseUrl, requests } = await startMockServer((req, res, seq) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ seq, status: "ready", ready: true }));
  });
  t.after(() => server.close());

  process.env.AI_BASE_URL = baseUrl;
  process.env.AI_API_KEY = "k1";

  await fetchAiHealth();
  await fetchAiHealth();
  await calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur" });
  await calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur" });
  await predictAiLive({ province: "Jawa Timur", horizonWeeks: 2 });
  await predictAiLive({ province: "Jawa Timur", horizonWeeks: 2 });
  await fetchAiForecasts();
  assert.equal(requests.length, 7);

  // Cached hit sebelum ingest
  await fetchAiForecasts();
  assert.equal(requests.length, 7);

  // Ingest dipanggil 2x tidak di-cache dan membersihkan cache forecasts
  await ingestAiWeeklyPrices({ weekStart: "2026-11-23", updates: [{ province: "Aceh", producerPrice: 14500 }] });
  await ingestAiWeeklyPrices({ weekStart: "2026-11-23", updates: [{ province: "Aceh", producerPrice: 14600 }] });
  assert.equal(requests.length, 9);

  await fetchAiForecasts();
  assert.equal(requests.length, 10);
});

test("error mapping lengkap, body non-JSON, 422 detail, 429 Retry-After, dan keamanan log", async (t) => {
  let mode = "starting";
  const { server, baseUrl } = await startMockServer(async (req, res) => {
    if (mode === "starting") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "SERVICE_STARTING", message: "Loading..." } }));
    } else if (mode === "timeout") {
      await new Promise((r) => setTimeout(r, 200));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } else if (mode === "unavailable503") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "SECRET_PATH_INTERNAL" } }));
    } else if (mode === "err500") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Traceback DB_SECRET_LEAK" } }));
    } else if (mode === "err401") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid key" } }));
    } else if (mode === "err400") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "INVALID_HORIZON", message: "Horizon wajib 2 atau 4" } }));
    } else if (mode === "err404") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "REGION_NOT_FOUND", message: "Wilayah tidak ada" } }));
    } else if (mode === "err422") {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          detail: [{ loc: ["body", "horizonWeeks"], msg: "Input should be 2 or 4", type: "literal_error" }],
        })
      );
    } else if (mode === "err429") {
      res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "45" });
      res.end(JSON.stringify({ message: "Terlalu banyak permintaan" }));
    } else if (mode === "err413") {
      res.writeHead(413, { "Content-Type": "text/html" });
      res.end("<html><body>413 Payload Too Large</body></html>");
    } else if (mode === "html502") {
      res.writeHead(502, { "Content-Type": "text/html" });
      res.end("<html><body>502 Bad Gateway INTERNAL_TRACE</body></html>");
    } else if (mode === "html200") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body>Unexpected HTML on 200</body></html>");
    }
  });
  t.after(() => server.close());

  process.env.AI_BASE_URL = baseUrl;
  process.env.AI_API_KEY = "do-not-print-this-secret-token";

  const infoLogs = [];
  const warnLogs = [];
  const origInfo = console.info;
  const origWarn = console.warn;
  console.info = (...args) => infoLogs.push(args.join(" "));
  console.warn = (...args) => warnLogs.push(args.join(" "));
  t.after(() => {
    console.info = origInfo;
    console.warn = origWarn;
  });

  // 503 SERVICE_STARTING
  await assert.rejects(
    () => calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur" }),
    (err) => err instanceof ApiError && err.status === 503 && err.code === "AI_SERVICE_STARTING"
  );

  // Timeout -> 503 AI_SERVICE_STARTING
  mode = "timeout";
  await assert.rejects(
    () => calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur" }, { timeoutMs: 40 }),
    (err) => err instanceof ApiError && err.status === 503 && err.code === "AI_SERVICE_STARTING"
  );

  // 503 SERVICE_UNAVAILABLE (pesan internal upstream tidak bocor)
  mode = "unavailable503";
  await assert.rejects(
    () => calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur" }),
    (err) =>
      err instanceof ApiError &&
      err.status === 503 &&
      err.code === "AI_SERVICE_UNAVAILABLE" &&
      !err.message.includes("SECRET_PATH_INTERNAL")
  );

  // 500 -> 503 AI_SERVICE_UNAVAILABLE (pesan internal upstream tidak bocor)
  mode = "err500";
  await assert.rejects(
    () => calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur" }),
    (err) =>
      err instanceof ApiError &&
      err.status === 503 &&
      err.code === "AI_SERVICE_UNAVAILABLE" &&
      !err.message.includes("DB_SECRET_LEAK")
  );

  // 401 -> 503 AI_AUTH_ERROR + log warning tanpa API key
  mode = "err401";
  await assert.rejects(
    () => fetchAiModelEvaluation({ retryDelayMs: 0 }),
    (err) => err instanceof ApiError && err.status === 503 && err.code === "AI_AUTH_ERROR"
  );
  assert.ok(warnLogs.some((m) => m.includes("401")));
  assert.equal(
    [...warnLogs, ...infoLogs].some((m) => m.includes("do-not-print-this-secret-token")),
    false
  );

  // 400 & 404 passthrough
  mode = "err400";
  await assert.rejects(
    () => fetchAiForecasts({ province: "Aceh" }),
    (err) => err instanceof ApiError && err.status === 400 && err.code === "INVALID_HORIZON" && err.message.includes("Horizon wajib")
  );

  mode = "err404";
  await assert.rejects(
    () => fetchAiSpatialDisparity({ province: "Atlantis" }),
    (err) => err instanceof ApiError && err.status === 404 && err.code === "REGION_NOT_FOUND"
  );

  // 422 preserves array detail + ErrorHandler exposes it
  mode = "err422";
  let captured422;
  try {
    await predictAiLive({ province: "Jawa Timur", horizonWeeks: 2 });
  } catch (err) {
    captured422 = err;
  }
  assert.ok(captured422 instanceof ApiError && captured422.status === 422);
  assert.ok(Array.isArray(captured422.detail));
  assert.deepEqual(captured422.detail[0].loc, ["body", "horizonWeeks"]);

  // 429 preserves Retry-After + ErrorHandler forwards header
  mode = "err429";
  let captured429;
  try {
    await calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur" });
  } catch (err) {
    captured429 = err;
  }
  assert.ok(captured429 instanceof ApiError && captured429.status === 429 && captured429.retryAfter === "45");

  const miniApp = express();
  miniApp.get("/t422", () => {
    throw captured422;
  });
  miniApp.get("/t429", () => {
    throw captured429;
  });
  miniApp.use(errorHandler);
  const miniServer = miniApp.listen(0, "127.0.0.1");
  await once(miniServer, "listening");
  t.after(() => miniServer.close());

  const miniPort = miniServer.address().port;
  const r422 = await fetch(`http://127.0.0.1:${miniPort}/t422`);
  assert.equal(r422.status, 422);
  const r422Json = await r422.json();
  assert.ok(Array.isArray(r422Json.detail));

  const r429 = await fetch(`http://127.0.0.1:${miniPort}/t429`);
  assert.equal(r429.status, 429);
  assert.equal(r429.headers.get("retry-after"), "45");

  // 4xx lain (413 HTML) -> 502 AI_UNEXPECTED_RESPONSE
  mode = "err413";
  await assert.rejects(
    () => calculateAiFairPrice({ grainType: "GKP", region: "Jawa Timur" }),
    (err) => err instanceof ApiError && err.status === 502 && err.code === "AI_UNEXPECTED_RESPONSE"
  );

  // HTML non-JSON 502 -> 503 AI_SERVICE_UNAVAILABLE tanpa crash
  mode = "html502";
  await assert.rejects(
    () => fetchAiPriceBoard({ region: "Jawa Barat" }),
    (err) =>
      err instanceof ApiError &&
      err.status === 503 &&
      err.code === "AI_SERVICE_UNAVAILABLE" &&
      !err.message.includes("INTERNAL_TRACE")
  );

  // HTML non-JSON 200 -> 502 AI_UNEXPECTED_RESPONSE
  mode = "html200";
  await assert.rejects(
    () => fetchAiPriceBoard({ region: "Jawa Barat" }),
    (err) => err instanceof ApiError && err.status === 502 && err.code === "AI_UNEXPECTED_RESPONSE"
  );

  // Network error (ECONNREFUSED) -> 503 AI_SERVICE_UNAVAILABLE
  const dead = await startMockServer((_, res) => res.end("{}"));
  const deadUrl = dead.baseUrl;
  await new Promise((resolve) => dead.server.close(resolve));
  process.env.AI_BASE_URL = deadUrl;
  await assert.rejects(
    () => fetchAiModelEvaluation(),
    (err) => err instanceof ApiError && err.status === 503 && err.code === "AI_SERVICE_UNAVAILABLE"
  );

  // Pastikan log hanya mencatat path tanpa query sensitif
  assert.ok(infoLogs.some((m) => m.includes("GET /api/v1/forecasts")));
  assert.equal(infoLogs.some((m) => m.includes("?")), false);
});

test("retry hanya 1x pada GET AI_SERVICE_STARTING; tidak retry POST predict/live & admin/ingest", async (t) => {
  let attemptCount = 0;
  const { server, baseUrl, requests } = await startMockServer((req, res) => {
    attemptCount += 1;
    if (req.method === "GET" && attemptCount === 1) {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "SERVICE_STARTING", message: "Starting" } }));
      return;
    }
    if (req.method === "POST") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "SERVICE_STARTING", message: "Starting" } }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ retried: true }));
  });
  t.after(() => server.close());

  process.env.AI_BASE_URL = baseUrl;
  process.env.AI_API_KEY = "k1";

  const okAfterRetry = await fetchAiForecasts({ province: "Aceh" }, { retryDelayMs: 10 });
  assert.deepEqual(okAfterRetry, { retried: true });
  assert.equal(requests.filter((r) => r.method === "GET").length, 2);

  await assert.rejects(
    () => predictAiLive({ province: "Jawa Timur", horizonWeeks: 2 }, { retryDelayMs: 10 }),
    (err) => err instanceof ApiError && err.code === "AI_SERVICE_STARTING"
  );
  await assert.rejects(
    () =>
      ingestAiWeeklyPrices(
        { weekStart: "2026-11-23", updates: [{ province: "Aceh", producerPrice: 14500 }] },
        { retryDelayMs: 10 }
      ),
    (err) => err instanceof ApiError && err.code === "AI_SERVICE_STARTING"
  );
  await assert.rejects(
    () => calculateAiFairPrice({ grainType: "GKP", region: "Aceh" }, { retryDelayMs: 10 }),
    (err) => err instanceof ApiError && err.code === "AI_SERVICE_STARTING"
  );

  // Ketiga POST masing-masing hanya hit 1x (tidak di-retry)
  assert.equal(requests.filter((r) => r.method === "POST").length, 3);

  // GET gagal 2x berturut-turut dengan SERVICE_STARTING -> berhenti setelah tepat 2 percobaan
  const { server: failTwiceSrv, baseUrl: failTwiceUrl, requests: failTwiceReqs } = await startMockServer(
    (_req, res) => {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { code: "SERVICE_STARTING", message: "Still loading" } }));
    }
  );
  t.after(() => failTwiceSrv.close());
  process.env.AI_BASE_URL = failTwiceUrl;
  await assert.rejects(
    () => fetchAiPriceBoard({ region: "Jawa Barat" }, { retryDelayMs: 10 }),
    (err) => err instanceof ApiError && err.status === 503 && err.code === "AI_SERVICE_STARTING"
  );
  assert.equal(failTwiceReqs.length, 2);

  // GET /health 503 starting & unavailable mengembalikan httpStatus 503 dan ready=false tanpa retry
  let healthMode = "starting";
  const { server: h503Srv, baseUrl: h503Url, requests: h503Reqs } = await startMockServer((_req, res) => {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: healthMode, ready: false, modelVersion: "sambung-predict-v1", apiVersion: "v1" }));
  });
  t.after(() => h503Srv.close());
  process.env.AI_BASE_URL = h503Url;
  const hStarting = await fetchAiHealth();
  assert.equal(hStarting.httpStatus, 503);
  assert.equal(hStarting.data.ready, false);
  assert.equal(hStarting.data.status, "starting");

  healthMode = "unavailable";
  const hUnavail = await fetchAiHealth();
  assert.equal(hUnavail.httpStatus, 503);
  assert.equal(hUnavail.data.ready, false);
  assert.equal(hUnavail.data.status, "unavailable");
  assert.equal(h503Reqs.length, 2);
});

test("warmUpAi memanaskan /health + endpoint baca dan tidak melempar error saat AI down", async (t) => {
  const { server, baseUrl, requests } = await startMockServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ready", ready: true }));
  });
  t.after(() => server.close());

  process.env.AI_BASE_URL = baseUrl;
  process.env.AI_API_KEY = "k1";

  await warmUpAi({ retryDelayMs: 5 });
  const paths = new Set(requests.map((r) => r.path));
  assert.ok(paths.has("/health"));
  assert.ok(paths.has("/api/v1/forecasts"));
  assert.ok(paths.has("/api/v1/spatial-disparity"));
  assert.ok(paths.has("/api/v1/price-board"));
  assert.ok(paths.has("/api/v1/fair-price/params"));
  assert.ok(paths.has("/api/v1/model-evaluation"));

  // Saat config kosong, warmUpAi tidak throw
  delete process.env.AI_BASE_URL;
  await warmUpAi({ retryDelayMs: 5 });
});
