import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app.ts";
import { digest } from "../../src/modules/auth/session.ts";
import { clearAiCache } from "../../src/modules/ai/ai-api.client.ts";
import { clearPriceHistoryCache } from "../../src/modules/ai/price-history.service.ts";
import { sendSubscriptionExpiryReminders } from "../../src/modules/subscriptions/subscriptions.service.ts";

function signWebhook({ order_id, status_code, gross_amount, secret }) {
  return createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${secret}`, "utf8")
    .digest("hex");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

test("Buyer Subscription Pembeli Pro: Rp99rb Midtrans Snap, stacking 30d, fee 0.25%, & gating", async (t) => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith("_test"));
  const db = new PrismaClient({ datasourceUrl: url });

  const envKeys = [
    "AI_BASE_URL",
    "AI_API_KEY",
    "MIDTRANS_SERVER_KEY",
    "MIDTRANS_CLIENT_KEY",
    "MIDTRANS_SIGNATURE_SECRET_KEY",
    "MIDTRANS_SNAP_BASE_URL",
    "MIDTRANS_API_BASE_URL",
    "MIDTRANS_TIMEOUT_MS",
  ];
  const savedEnv = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));

  clearAiCache();
  clearPriceHistoryCache();

  const baseForecastRecords = [
    {
      id: "fc-jatim-2w",
      horizonWeeks: 2,
      province: "Jawa Timur",
      commodity: "Beras Kualitas Medium I",
      targetDate: "30 Nov 2026",
      targetDateIso: "2026-11-30",
      riceProducerPrice: 13450,
      confidenceInterval80: [13400, 13500],
      gkpEstimate: 6942,
      gkgEstimate: 8160,
      method: "Mode AI",
      isFallback: false,
      shapContributions: [
        {
          feature: "Kondisi Cuaca & Curah Hujan",
          impact: 120,
          description: "Curah hujan normal mendorong kestabilan pasokan.",
          category: "cuaca",
        },
      ],
      historicalSeries: [{ week: "16 Nov", actualPrice: 13450 }],
    },
    {
      id: "fc-jabar-2w",
      horizonWeeks: 2,
      province: "Jawa Barat",
      commodity: "Beras Kualitas Medium I",
      targetDate: "30 Nov 2026",
      targetDateIso: "2026-11-30",
      riceProducerPrice: 13100,
      confidenceInterval80: [13020, 13180],
      gkpEstimate: 6762,
      gkgEstimate: 7948,
      method: "Mode AI",
      isFallback: false,
      shapContributions: [
        {
          feature: "Harga & Selisih Pasar Lokal",
          impact: -90,
          description: "Panen raya menahan kenaikan harga beras.",
          category: "harga_lokal",
        },
      ],
      historicalSeries: [{ week: "16 Nov", actualPrice: 13100 }],
    },
  ];

  const aiServer = createServer(async (req, res) => {
    if (req.headers["x-api-key"] !== "test-ai-key") {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid key" } }));
    }

    const parsed = new URL(req.url ?? "/", "http://127.0.0.1");
    if (req.method === "GET" && parsed.pathname === "/api/v1/forecasts") {
      const prov = parsed.searchParams.get("province")?.trim().toLowerCase();
      const records = prov
        ? baseForecastRecords.filter((r) => r.province.toLowerCase() === prov)
        : baseForecastRecords;
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          generatedAtUtc: "2026-11-27T06:39:31+00:00",
          latestObservationWeek: "2026-11-16",
          modelName: "Sambung Predict",
          modelVersion: "sambung-predict-v1",
          derivedConversion: { rGkp: 0.5338, rGkg: 0.6274, p50QGkp: 0.9669, p50QGkg: 0.9662 },
          sourceMode: "live",
          records,
        })
      );
    }

    if (req.method === "POST" && parsed.pathname === "/api/v1/fair-price/calculate") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          grainType: "GKP",
          region: "Jawa Timur",
          lowerBound: 6366,
          upperBound: 7405,
          medianPrice: 6942,
          ricePrice: 13450,
          rendemen: 0.5338,
          referenceSource: "fixture",
        })
      );
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: "Unknown mock path" } }));
  }).listen(0, "127.0.0.1");
  await once(aiServer, "listening");

  const midtransState = {
    snapCalls: [],
    statusCalls: [],
    cancelCalls: [],
    nextStatusMode: new Map(),
    expectedBasicAuth: `Basic ${Buffer.from("Mid-server-mock-secret:", "utf8").toString("base64")}`,
  };

  const midtransServer = createServer(async (req, res) => {
    if (req.headers.authorization !== midtransState.expectedBasicAuth) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status_message: "Unauthorized" }));
    }

    const reqUrl = req.url || "";
    if (req.method === "POST" && reqUrl === "/snap/v1/transactions") {
      const body = await readJsonBody(req);
      midtransState.snapCalls.push(body);
      const token = `sub-snap-${midtransState.snapCalls.length}-${randomBytes(4).toString("hex")}`;
      res.writeHead(201, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          token,
          redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/${token}`,
        })
      );
    }

    const statusMatch = reqUrl.match(/^\/v2\/([^/]+)\/status$/);
    if (req.method === "GET" && statusMatch) {
      const orderId = decodeURIComponent(statusMatch[1]);
      midtransState.statusCalls.push(orderId);
      const scripted = midtransState.nextStatusMode.get(orderId);
      if (scripted) {
        res.writeHead(scripted.httpStatus, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(scripted.body));
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status_code: "404", status_message: "Transaction doesn't exist." }));
    }

    const cancelMatch = reqUrl.match(/^\/v2\/([^/]+)\/cancel$/);
    if (req.method === "POST" && cancelMatch) {
      const orderId = decodeURIComponent(cancelMatch[1]);
      midtransState.cancelCalls.push(orderId);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status_code: "200", transaction_status: "cancel", order_id: orderId }));
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status_message: "Unknown Midtrans mock path" }));
  }).listen(0, "127.0.0.1");
  await once(midtransServer, "listening");

  process.env.AI_BASE_URL = `http://127.0.0.1:${aiServer.address().port}`;
  process.env.AI_API_KEY = "test-ai-key";
  process.env.MIDTRANS_SERVER_KEY = "Mid-server-mock-secret";
  process.env.MIDTRANS_CLIENT_KEY = "Mid-client-mock-public";
  process.env.MIDTRANS_SIGNATURE_SECRET_KEY = "Mid-webhook-signature-secret";
  process.env.MIDTRANS_SNAP_BASE_URL = `http://127.0.0.1:${midtransPortSafe(midtransServer)}`;
  process.env.MIDTRANS_API_BASE_URL = `http://127.0.0.1:${midtransPortSafe(midtransServer)}`;
  process.env.MIDTRANS_TIMEOUT_MS = "5000";

  function midtransPortSafe(server) {
    return server.address().port;
  }

  const origin = "http://localhost:3000";
  const app = createApp(db, origin).listen(0, "127.0.0.1");
  await once(app, "listening");
  const baseUrl = `http://127.0.0.1:${app.address().port}`;

  t.after(async () => {
    clearAiCache();
    clearPriceHistoryCache();
    app.close();
    aiServer.close();
    midtransServer.close();
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await db.$disconnect();
  });

  // Ensure sample weekly price-history rows exist for Jawa Timur
  await db.marketPriceHistory.deleteMany({ where: { region: "Jawa Timur" } });
  const sampleDates = [
    "2025-12-29",
    "2026-08-24",
    "2026-08-31",
    "2026-09-07",
    "2026-09-14",
    "2026-09-21",
    "2026-09-28",
    "2026-10-05",
    "2026-10-12",
    "2026-10-19",
    "2026-10-26",
    "2026-11-02",
    "2026-11-09",
    "2026-11-16",
  ];
  await db.marketPriceHistory.createMany({
    data: sampleDates.map((iso) => ({
      region: "Jawa Timur",
      commodity: "Beras Medium I",
      weekStart: new Date(`${iso}T00:00:00.000Z`),
      farmerPrice: 13005,
      millerPrice: 13450,
      wholesalePrice: 14950,
      retailPrice: 15250,
      source: "pihps_bi",
    })),
  });

  const suffix = randomUUID().slice(0, 8);
  const regionId = `JEMBER-${suffix}`;
  await db.region.create({
    data: { id: regionId, province: "Jawa Timur", regency: "Jember" },
  });

  const farmer = await db.account.create({
    data: {
      role: "petani",
      name: "Petani Uji Pro",
      phone: `08111${randomUUID().replace(/\D/g, "").slice(0, 8)}`,
      province: "Jawa Timur",
      regency: "Jember",
      district: "Sumbersari",
    },
  });
  const buyer = await db.account.create({
    data: {
      role: "pembeli",
      name: "Pembeli Uji Pro",
      businessName: "UD Beras Nusantara",
      phone: `08222${randomUUID().replace(/\D/g, "").slice(0, 8)}`,
      email: `buyer-${suffix}@sambung.id`,
      province: "Jawa Timur",
      regency: "Jember",
      district: "Sumbersari",
    },
  });

  const farmerToken = randomBytes(32).toString("hex");
  const buyerToken = randomBytes(32).toString("hex");
  await db.authSession.createMany({
    data: [
      {
        phone: farmer.phone,
        accountId: farmer.id,
        tokenHash: digest(farmerToken),
        expiresAt: new Date(Date.now() + 600_000),
      },
      {
        phone: buyer.phone,
        accountId: buyer.id,
        tokenHash: digest(buyerToken),
        expiresAt: new Date(Date.now() + 600_000),
      },
    ],
  });
  const farmerCookie = `sambung_session=${farmerToken}`;
  const buyerCookie = `sambung_session=${buyerToken}`;

  async function api(path, { method = "GET", cookie = "", body, headers = {} } = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json() };
  }

  // 0. Anonymous (unauthenticated): 401 UNAUTHENTICATED on /price-history & /forecasts
  const anonHistAll = await api("/price-history?region=Jawa%20Timur&range=all");
  assert.equal(anonHistAll.status, 401);
  assert.equal(anonHistAll.data.code, "UNAUTHENTICATED");

  const anonHist12w = await api("/price-history?region=Jawa%20Timur&range=12w");
  assert.equal(anonHist12w.status, 401);
  assert.equal(anonHist12w.data.code, "UNAUTHENTICATED");

  const anonForecast = await api("/forecasts?province=Jawa%20Timur");
  assert.equal(anonForecast.status, 401);
  assert.equal(anonForecast.data.code, "UNAUTHENTICATED");

  // 1. Petani: eligible=false, checkout forbidden 403, full access to /price-history & /forecasts
  const farmerSub = await api("/subscription/me", { cookie: farmerCookie });
  assert.equal(farmerSub.status, 200);
  assert.equal(farmerSub.data.data.eligible, false);
  assert.equal(farmerSub.data.data.status, "not_applicable");

  const farmerCheckout = await api("/subscription/checkout", {
    method: "POST",
    cookie: farmerCookie,
    body: {},
  });
  assert.equal(farmerCheckout.status, 403);

  const farmerHistAll = await api("/price-history?region=Jawa%20Timur&range=all", {
    cookie: farmerCookie,
  });
  assert.equal(farmerHistAll.status, 200);
  assert.ok(farmerHistAll.data.rows.length >= 14);

  const farmerForecastJabar = await api("/forecasts?province=Jawa%20Barat", {
    cookie: farmerCookie,
  });
  assert.equal(farmerForecastJabar.status, 200);
  assert.ok(farmerForecastJabar.data.records[0].shapContributions.length > 0);

  // 2. Pembeli Gratis: 403 on range=all & cross-province forecasts; 200 on 12w & local forecast without SHAP
  const buyerMeFree = await api("/auth/me", { cookie: buyerCookie });
  assert.equal(buyerMeFree.status, 200);
  assert.equal(buyerMeFree.data.user.isPro, false);
  assert.equal(buyerMeFree.data.user.subscriptionPlan, "free");

  const buyerHistAllFree = await api("/price-history?region=Jawa%20Timur&range=all", {
    cookie: buyerCookie,
  });
  assert.equal(buyerHistAllFree.status, 403);
  assert.equal(buyerHistAllFree.data.code, "SUBSCRIPTION_REQUIRED");

  const buyerHist12wFree = await api("/price-history?region=Jawa%20Timur&range=12w", {
    cookie: buyerCookie,
  });
  assert.equal(buyerHist12wFree.status, 200);

  const buyerForecastJabarFree = await api("/forecasts?province=Jawa%20Barat", {
    cookie: buyerCookie,
  });
  assert.equal(buyerForecastJabarFree.status, 403);
  assert.equal(buyerForecastJabarFree.data.code, "SUBSCRIPTION_REQUIRED");

  const buyerForecastJatimFree = await api("/forecasts?province=Jawa%20Timur", {
    cookie: buyerCookie,
  });
  assert.equal(buyerForecastJatimFree.status, 200);
  assert.equal(buyerForecastJatimFree.data.meta.restrictedPreview, true);
  assert.equal(buyerForecastJatimFree.data.meta.allowedProvince, "Jawa Timur");
  assert.deepEqual(buyerForecastJatimFree.data.records[0].shapContributions, []);

  // 3. Checkout Snap + reuse + recreate + 404 sync awaitingMethodSelection
  const checkout1 = await api("/subscription/checkout", {
    method: "POST",
    cookie: buyerCookie,
    body: {},
  });
  assert.equal(checkout1.status, 200);
  const firstOrderId = checkout1.data.data.payment.orderId;
  assert.ok(firstOrderId.startsWith("SUBS-"));
  assert.equal(checkout1.data.data.payment.amount, 99000);
  assert.equal(midtransState.snapCalls.length, 1);

  const checkoutReuse = await api("/subscription/checkout", {
    method: "POST",
    cookie: buyerCookie,
    body: {},
  });
  assert.equal(checkoutReuse.status, 200);
  assert.equal(checkoutReuse.data.data.payment.orderId, firstOrderId);
  assert.equal(midtransState.snapCalls.length, 1);

  const checkoutRecreate = await api("/subscription/checkout", {
    method: "POST",
    cookie: buyerCookie,
    body: { recreate: true },
  });
  assert.equal(checkoutRecreate.status, 200);
  const activeOrderId = checkoutRecreate.data.data.payment.orderId;
  assert.notEqual(activeOrderId, firstOrderId);
  assert.equal(midtransState.snapCalls.length, 2);

  const sync404 = await api("/subscription/sync", {
    method: "POST",
    cookie: buyerCookie,
    body: { orderId: activeOrderId },
  });
  assert.equal(sync404.status, 200);
  assert.equal(sync404.data.data.awaitingMethodSelection, true);
  assert.equal(sync404.data.data.payment.status, "pending");

  // 4. Midtrans Webhook validation + settlement + monotonic/idempotent replay
  const badSig = await api("/payments/midtrans/webhook", {
    method: "POST",
    body: {
      order_id: activeOrderId,
      status_code: "200",
      gross_amount: "99000.00",
      transaction_status: "settlement",
      signature_key: "0".repeat(128),
    },
  });
  assert.equal(badSig.status, 403);

  const wrongAmountSig = signWebhook({
    order_id: activeOrderId,
    status_code: "200",
    gross_amount: "50000.00",
    secret: process.env.MIDTRANS_SIGNATURE_SECRET_KEY,
  });
  const badAmount = await api("/payments/midtrans/webhook", {
    method: "POST",
    body: {
      order_id: activeOrderId,
      status_code: "200",
      gross_amount: "50000.00",
      transaction_status: "settlement",
      signature_key: wrongAmountSig,
    },
  });
  assert.equal(badAmount.status, 422);

  const validSig = signWebhook({
    order_id: activeOrderId,
    status_code: "200",
    gross_amount: "99000.00",
    secret: process.env.MIDTRANS_SIGNATURE_SECRET_KEY,
  });
  const settle1 = await api("/payments/midtrans/webhook", {
    method: "POST",
    body: {
      order_id: activeOrderId,
      status_code: "200",
      gross_amount: "99000.00",
      transaction_status: "settlement",
      payment_type: "qris",
      transaction_id: "mid-sub-tx-1",
      signature_key: validSig,
    },
  });
  assert.equal(settle1.status, 200);
  assert.equal(settle1.data.status, "paid");
  const firstProExpiry = settle1.data.proExpiresAt;
  assert.ok(firstProExpiry);

  // Duplicate webhook + stale expire must NOT double-stack or downgrade
  await api("/payments/midtrans/webhook", {
    method: "POST",
    body: {
      order_id: activeOrderId,
      status_code: "200",
      gross_amount: "99000.00",
      transaction_status: "settlement",
      signature_key: validSig,
    },
  });
  const expireSig = signWebhook({
    order_id: activeOrderId,
    status_code: "202",
    gross_amount: "99000.00",
    secret: process.env.MIDTRANS_SIGNATURE_SECRET_KEY,
  });
  await api("/payments/midtrans/webhook", {
    method: "POST",
    body: {
      order_id: activeOrderId,
      status_code: "202",
      gross_amount: "99000.00",
      transaction_status: "expire",
      signature_key: expireSig,
    },
  });

  // 5. After Pembeli Pro active: unlocked routes & 0.25% escrow fee
  const subMePro = await api("/subscription/me", { cookie: buyerCookie });
  assert.equal(subMePro.status, 200);
  assert.equal(subMePro.data.data.isPro, true);
  assert.equal(subMePro.data.data.buyerFeeRate, 0.0025);
  assert.equal(subMePro.data.data.proExpiresAt, firstProExpiry);

  const buyerHistAllPro = await api("/price-history?region=Jawa%20Timur&range=all", {
    cookie: buyerCookie,
  });
  assert.equal(buyerHistAllPro.status, 200);
  assert.ok(buyerHistAllPro.data.rows.length >= 14);

  const buyerForecastJabarPro = await api("/forecasts?province=Jawa%20Barat", {
    cookie: buyerCookie,
  });
  assert.equal(buyerForecastJabarPro.status, 200);
  assert.equal(buyerForecastJabarPro.data.meta.restrictedPreview, undefined);
  assert.ok(buyerForecastJabarPro.data.records[0].shapContributions.length > 0);

  // Create & sign contract to verify 0.25% buyerFeeRate and 100% farmer contractAmount
  const offer = await db.offer.create({
    data: {
      districtId: regionId,
      grainType: "GKP",
      totalVolumeKg: 2000,
      askPrice: 6942,
      quality: 14,
      ownerId: farmer.id,
      status: "published",
    },
  });

  const orderPreview = await api("/price-checks/preview", {
    method: "POST",
    cookie: buyerCookie,
    body: { grainType: "GKP", regionId, quality: 14, price: 6942, action: "order" },
  });
  assert.equal(orderPreview.status, 200);

  const contractCreate = await api("/contracts", {
    method: "POST",
    cookie: buyerCookie,
    headers: { "Idempotency-Key": randomUUID() },
    body: {
      offerId: offer.id,
      volumeKg: 1000,
      proposedPrice: 6942,
      referenceVersion: orderPreview.data.reference.referenceVersion,
      redConfirmed: false,
    },
  });
  assert.equal(contractCreate.status, 201);
  const contractId = contractCreate.data.data.id;
  assert.equal(contractCreate.data.data.buyerIsPro, true);
  assert.equal(contractCreate.data.data.buyerFeeRate, 0.0025);

  const acceptPreview = await api("/price-checks/preview", {
    method: "POST",
    cookie: farmerCookie,
    body: { grainType: "GKP", regionId, quality: 14, price: 6942, action: "accept" },
  });
  assert.equal(acceptPreview.status, 200);

  const acceptRes = await api(`/contracts/${contractId}/accept`, {
    method: "POST",
    cookie: farmerCookie,
    headers: { "Idempotency-Key": randomUUID() },
    body: {
      priceOfferVersion: 1,
      referenceVersion: acceptPreview.data.reference.referenceVersion,
      redConfirmed: false,
    },
  });
  assert.equal(acceptRes.status, 200);

  const sign1 = await api(`/contracts/${contractId}/sign`, {
    method: "POST",
    cookie: farmerCookie,
    headers: { "Idempotency-Key": randomUUID() },
    body: { type: "type", signature: "Petani Uji Pro" },
  });
  assert.equal(sign1.status, 200);

  const sign2 = await api(`/contracts/${contractId}/sign`, {
    method: "POST",
    cookie: buyerCookie,
    headers: { "Idempotency-Key": randomUUID() },
    body: { type: "type", signature: "Pembeli Uji Pro" },
  });
  assert.equal(sign2.status, 200);

  const contractPayInit = await api(`/contracts/${contractId}/payment/initiate`, {
    method: "POST",
    cookie: buyerCookie,
    body: {},
  });
  assert.equal(contractPayInit.status, 200);
  assert.equal(contractPayInit.data.data.payment.contractAmount, 6_942_000);
  assert.equal(contractPayInit.data.data.payment.buyerFeeAmount, Math.round(6_942_000 * 0.0025));
  assert.equal(
    contractPayInit.data.data.payment.grossAmount,
    6_942_000 + Math.round(6_942_000 * 0.0025)
  );
  const lastSnapCall = midtransState.snapCalls[midtransState.snapCalls.length - 1];
  assert.ok(
    lastSnapCall.item_details.some((item) => item.id === "PLATFORM-FEE-025PCT")
  );

  // 6. Stacking renewal (+30d from existing proExpiresAt) & expiry reminder sweeper
  const checkoutStack = await api("/subscription/checkout", {
    method: "POST",
    cookie: buyerCookie,
    body: {},
  });
  assert.equal(checkoutStack.status, 200);
  const stackOrderId = checkoutStack.data.data.payment.orderId;
  const stackSig = signWebhook({
    order_id: stackOrderId,
    status_code: "200",
    gross_amount: "99000.00",
    secret: process.env.MIDTRANS_SIGNATURE_SECRET_KEY,
  });
  const settleStack = await api("/payments/midtrans/webhook", {
    method: "POST",
    body: {
      order_id: stackOrderId,
      status_code: "200",
      gross_amount: "99000.00",
      transaction_status: "settlement",
      signature_key: stackSig,
    },
  });
  assert.equal(settleStack.status, 200);
  const stackedMs =
    Date.parse(settleStack.data.proExpiresAt) - Date.parse(firstProExpiry);
  assert.equal(stackedMs, 30 * 86_400_000);

  // Expiry reminder sweeper (<7 days remaining)
  await db.account.update({
    where: { id: buyer.id },
    data: {
      proExpiresAt: new Date(Date.now() + 5 * 86_400_000),
      proReminderSentAt: null,
    },
  });
  const reminded1 = await sendSubscriptionExpiryReminders(db);
  const reminded2 = await sendSubscriptionExpiryReminders(db);
  assert.equal(reminded1, 1);
  assert.equal(reminded2, 0);
  const reminderNotif = await db.notification.findFirst({
    where: { accountId: buyer.id, title: "Masa Aktif Pembeli Pro Segera Berakhir" },
  });
  assert.ok(reminderNotif);
});
