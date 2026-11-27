import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app.ts";
import { digest } from "../../src/modules/auth/session.ts";
import {
  AUTO_CANCEL_REASON,
  PAYMENT_DUE_MS,
  PAYMENT_GRACE_MS,
  cancelUnpaidSignedContracts,
  sendPaymentOverdueReminders,
} from "../../src/modules/payments/payments.service.ts";

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

test("Midtrans Sandbox Escrow: P1-P3 skema BIGINT, 0.5% fee, idempotensi, webhook, gate ship, receive release, & sweeper 7+3 hari", async (t) => {
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

  // Mock AI reference server so preview/price checks remain hermetic
  const aiServer = createServer((req, res) => {
    if (req.headers["x-api-key"] !== "test-ai-key") {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid key" } }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
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
  }).listen(0, "127.0.0.1");
  await once(aiServer, "listening");

  // Stateful Midtrans Sandbox HTTP mock (handles Snap create, Core Status /v2, Cancel /v2)
  const midtransState = {
    snapCalls: [],
    statusCalls: [],
    cancelCalls: [],
    nextStatusMode: new Map(), // orderId -> { httpStatus, body }
    expectedBasicAuth: `Basic ${Buffer.from("Mid-server-mock-secret:", "utf8").toString("base64")}`,
  };

  const midtransServer = createServer(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== midtransState.expectedBasicAuth) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status_message: "Access denied due to unauthorized transaction" }));
    }

    const reqUrl = req.url || "";
    if (req.method === "POST" && reqUrl === "/snap/v1/transactions") {
      const body = await readJsonBody(req);
      midtransState.snapCalls.push(body);
      const token = `snap-token-${midtransState.snapCalls.length}-${randomBytes(4).toString("hex")}`;
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
    res.end(JSON.stringify({ status_message: "Unknown mock path" }));
  }).listen(0, "127.0.0.1");
  await once(midtransServer, "listening");

  const aiPort = aiServer.address().port;
  const midtransPort = midtransServer.address().port;

  process.env.AI_BASE_URL = `http://127.0.0.1:${aiPort}`;
  process.env.AI_API_KEY = "test-ai-key";
  delete process.env.MIDTRANS_SERVER_KEY;
  delete process.env.MIDTRANS_CLIENT_KEY;
  delete process.env.MIDTRANS_SIGNATURE_SECRET_KEY;
  delete process.env.MIDTRANS_SNAP_BASE_URL;
  delete process.env.MIDTRANS_API_BASE_URL;

  const app = createApp(db, "http://localhost:3000").listen(0, "127.0.0.1");
  await once(app, "listening");
  const baseAppUrl = `http://127.0.0.1:${app.address().port}`;

  t.after(async () => {
    app.close();
    aiServer.close();
    midtransServer.close();
    for (const k of envKeys) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
    await db.$disconnect();
  });

  async function login(role, email = null) {
    const person = await db.account.create({
      data: {
        name: `Test ${role}`,
        role,
        phone: randomUUID(),
        email,
        province: "Jawa Timur",
        regency: "Jember",
        district: "Sumbersari",
      },
    });
    const token = randomBytes(32).toString("hex");
    await db.authSession.create({
      data: {
        phone: person.phone,
        accountId: person.id,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 300_000),
      },
    });
    return { id: person.id, role, cookie: `sambung_session=${token}` };
  }

  async function api(path, user, body = undefined, key = randomUUID()) {
    const headers = { "Content-Type": "application/json", "Idempotency-Key": key };
    if (user?.cookie) headers.cookie = user.cookie;
    const res = await fetch(`${baseAppUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json();
    return { ...json, httpStatus: res.status };
  }

  const farmer = await login("petani");
  const buyer = await login("pembeli", null); // OTP user without email
  const otherBuyer = await login("pembeli", "other@example.com");
  const admin = await login("admin", `admin-${randomUUID().slice(0, 8)}@sambung.id`);

  const offer = await db.offer.create({
    data: {
      districtId: "Sumbersari",
      grainType: "GKP",
      totalVolumeKg: 1000000,
      askPrice: 6500,
      quality: 22,
      ownerId: farmer.id,
      status: "published",
    },
  });

  async function previewRef(action, price) {
    const ref = await api("/price-checks/preview", buyer, {
      regionId: "Sumbersari",
      quality: 22,
      grainType: "GKP",
      action,
      price,
    });
    return {
      referenceVersion: ref.reference.referenceVersion,
      redConfirmed: ref.requiresConfirmation,
    };
  }

  async function createSignedContract(volumeKg = 400000, price = 6500) {
    const created = await api("/contracts", buyer, {
      offerId: offer.id,
      volumeKg,
      proposedPrice: price,
      ...(await previewRef("order", price)),
    });
    assert.equal(created.httpStatus, 201, JSON.stringify(created));
    const id = created.data.id;
    const accepted = await api(`/contracts/${id}/accept`, farmer, {
      priceOfferVersion: 1,
      ...(await previewRef("accept", price)),
    });
    assert.equal(accepted.data.status, "approved");
    await api(`/contracts/${id}/sign`, farmer, { type: "type", signature: "Pak Petani" });
    const signed = await api(`/contracts/${id}/sign`, buyer, {
      type: "type",
      signature: "PT Penggilingan",
    });
    assert.equal(signed.data.status, "signed");
    assert.ok(signed.data.paymentDueAt);
    assert.ok(signed.data.paymentGraceEndsAt);
    return signed.data;
  }

  // Contract #1: Large BIGINT volume (400,000 kg * Rp6,500 = Rp2,600,000,000 -> exceeds 32-bit INT max)
  const c1 = await createSignedContract(400000, 6500);

  // Scenario 1: Unconfigured Midtrans -> 503 PAYMENT_NOT_CONFIGURED; production URL -> 503 PAYMENT_INVALID_CONFIG
  const unconf = await api(`/contracts/${c1.id}/payment/initiate`, buyer, {});
  assert.equal(unconf.httpStatus, 503);
  assert.equal(unconf.code, "PAYMENT_NOT_CONFIGURED");

  process.env.MIDTRANS_SERVER_KEY = "Mid-server-mock-secret";
  process.env.MIDTRANS_CLIENT_KEY = "Mid-client-mock-public";
  process.env.MIDTRANS_SIGNATURE_SECRET_KEY = "sig-secret-mock-value";
  process.env.MIDTRANS_SNAP_BASE_URL = "https://app.midtrans.com";
  process.env.MIDTRANS_API_BASE_URL = "https://api.midtrans.com";

  const prodBlocked = await api(`/contracts/${c1.id}/payment/initiate`, buyer, {});
  assert.equal(prodBlocked.httpStatus, 503);
  assert.equal(prodBlocked.code, "PAYMENT_INVALID_CONFIG");

  // Point cleanly to local HTTP mock server & accept Mid-... key format
  process.env.MIDTRANS_SNAP_BASE_URL = `http://127.0.0.1:${midtransPort}`;
  process.env.MIDTRANS_API_BASE_URL = `http://127.0.0.1:${midtransPort}`;

  // Scenario 3: Role & status guards + Scenario 4: ship gate before paid
  assert.equal((await api(`/contracts/${c1.id}/payment/initiate`, farmer, {})).httpStatus, 403);
  assert.equal((await api(`/contracts/${c1.id}/payment/initiate`, otherBuyer, {})).httpStatus, 404);
  const prePaidShip = await api(`/contracts/${c1.id}/ship`, farmer, { notes: "Coba kirim dulu" });
  assert.equal(prePaidShip.httpStatus, 409);
  assert.equal(prePaidShip.code, "PAYMENT_REQUIRED");

  // Contract pending cannot initiate
  const pendingContract = await api("/contracts", buyer, {
    offerId: offer.id,
    volumeKg: 1000,
    proposedPrice: 6500,
    ...(await previewRef("order", 6500)),
  });
  const initPending = await api(`/contracts/${pendingContract.data.id}/payment/initiate`, buyer, {});
  assert.equal(initPending.httpStatus, 409);
  assert.equal(initPending.code, "INVALID_STATUS");

  // Scenario 2 & 5: Concurrent duplicate initiate + 0.5% fee + BIGINT + omitted null email
  const [initA, initB] = await Promise.all([
    api(`/contracts/${c1.id}/payment/initiate`, buyer, {}),
    api(`/contracts/${c1.id}/payment/initiate`, buyer, {}),
  ]);
  const statuses = [initA.httpStatus, initB.httpStatus].sort((a, b) => a - b);
  assert.ok(statuses[0] === 200, JSON.stringify({ initA, initB }));
  if (statuses[1] === 200) {
    assert.equal(initA.data.payment.orderId, initB.data.payment.orderId);
    assert.equal(initA.data.snapToken, initB.data.snapToken);
  } else {
    assert.equal(statuses[1], 409);
  }
  assert.equal(midtransState.snapCalls.length, 1);

  const snapPayload1 = midtransState.snapCalls[0];
  assert.equal(snapPayload1.transaction_details.gross_amount, 2_613_000_000);
  assert.equal(snapPayload1.item_details.length, 2);
  assert.equal(snapPayload1.item_details[0].price, 2_600_000_000);
  assert.equal(snapPayload1.item_details[1].price, 13_000_000);
  assert.equal("email" in snapPayload1.customer_details, false);
  assert.ok(snapPayload1.transaction_details.order_id.length <= 50);

  const initReuse = await api(`/contracts/${c1.id}/payment/initiate`, buyer, {});
  assert.equal(initReuse.httpStatus, 200);
  assert.equal(midtransState.snapCalls.length, 1);
  assert.equal(initReuse.data.clientKey, "Mid-client-mock-public");

  const order1 = initReuse.data.payment.orderId;

  // Scenario 7: Midtrans 404 quirk on /sync (HTTP 404 AND HTTP 200 status_code "404") keeps status pending
  const sync404Http = await api(`/contracts/${c1.id}/payment/sync`, buyer, {});
  assert.equal(sync404Http.httpStatus, 200);
  assert.equal(sync404Http.data.payment.status, "pending");
  assert.equal(sync404Http.data.awaitingMethodSelection, true);

  midtransState.nextStatusMode.set(order1, {
    httpStatus: 200,
    body: { status_code: "404", status_message: "Transaction doesn't exist." },
  });
  const sync404Json = await api(`/contracts/${c1.id}/payment/sync`, farmer, {});
  assert.equal(sync404Json.httpStatus, 200);
  assert.equal(sync404Json.data.payment.status, "pending");
  assert.equal(sync404Json.data.awaitingMethodSelection, true);

  // Scenario 6: Switch payment method (recreate: true) -> checks status, cancels old pending, creates attempt 2
  midtransState.nextStatusMode.set(order1, {
    httpStatus: 200,
    body: { status_code: "201", transaction_status: "pending", order_id: order1 },
  });
  const recreated = await api(`/contracts/${c1.id}/payment/initiate`, buyer, { recreate: true });
  assert.equal(recreated.httpStatus, 200, JSON.stringify(recreated));
  assert.equal(recreated.data.payment.attempt, 2);
  assert.notEqual(recreated.data.payment.orderId, order1);
  assert.deepEqual(midtransState.cancelCalls, [order1]);
  assert.equal(midtransState.snapCalls.length, 2);

  const order2 = recreated.data.payment.orderId;
  const gross2Str = "2613000000.00";

  // Scenario 8: Webhook security checks (invalid signature, mismatched amount, unknown order_id)
  const badSig = await api("/payments/midtrans/webhook", null, {
    order_id: order2,
    status_code: "200",
    gross_amount: gross2Str,
    signature_key: "0".repeat(128),
    transaction_status: "settlement",
  });
  assert.equal(badSig.httpStatus, 403);

  const badAmount = await api("/payments/midtrans/webhook", null, {
    order_id: order2,
    status_code: "200",
    gross_amount: "1000.00",
    signature_key: signWebhook({
      order_id: order2,
      status_code: "200",
      gross_amount: "1000.00",
      secret: "sig-secret-mock-value",
    }),
    transaction_status: "settlement",
  });
  assert.equal(badAmount.httpStatus, 422);

  const unknownOrder = await api("/payments/midtrans/webhook", null, {
    order_id: "SMBG-UNKNOWN-99",
    status_code: "200",
    gross_amount: gross2Str,
    signature_key: signWebhook({
      order_id: "SMBG-UNKNOWN-99",
      status_code: "200",
      gross_amount: gross2Str,
      secret: "sig-secret-mock-value",
    }),
    transaction_status: "settlement",
  });
  assert.equal(unknownOrder.httpStatus, 404);

  // Scenario 9: Valid webhook settlement -> paid + escrow held + exact 1 notification pair + monotonic guard
  const settledWebhook = await api("/payments/midtrans/webhook", null, {
    order_id: order2,
    status_code: "200",
    gross_amount: gross2Str,
    signature_key: signWebhook({
      order_id: order2,
      status_code: "200",
      gross_amount: gross2Str,
      secret: "sig-secret-mock-value",
    }),
    transaction_status: "settlement",
    transaction_id: "mid-tx-123",
    payment_type: "bank_transfer",
    va_numbers: [{ bank: "bca", va_number: "1234567890" }],
  });
  assert.equal(settledWebhook.httpStatus, 200);
  assert.equal(settledWebhook.status, "paid");
  assert.equal(settledWebhook.escrowStatus, "held");

  // Duplicate settlement & out-of-order delayed expire/pending MUST not downgrade or duplicate notifications
  const delayedExpire = await api("/payments/midtrans/webhook", null, {
    order_id: order2,
    status_code: "407",
    gross_amount: gross2Str,
    signature_key: signWebhook({
      order_id: order2,
      status_code: "407",
      gross_amount: gross2Str,
      secret: "sig-secret-mock-value",
    }),
    transaction_status: "expire",
  });
  assert.equal(delayedExpire.httpStatus, 200);
  assert.equal(delayedExpire.status, "paid");
  assert.equal(delayedExpire.escrowStatus, "held");

  // Also test out-of-order delayed webhook on attempt #1 (which is cancelled) MUST NOT violate partial pending index!
  const delayedPendingOldAttempt = await api("/payments/midtrans/webhook", null, {
    order_id: order1,
    status_code: "201",
    gross_amount: gross2Str,
    signature_key: signWebhook({
      order_id: order1,
      status_code: "201",
      gross_amount: gross2Str,
      secret: "sig-secret-mock-value",
    }),
    transaction_status: "pending",
  });
  assert.equal(delayedPendingOldAttempt.httpStatus, 200);
  assert.equal(delayedPendingOldAttempt.status, "cancelled");

  // Late settlement webhook on cancelled attempt #1 while attempt #2 is already paid -> alert logged cleanly without P2002
  const lateDoubleSettlement = await api("/payments/midtrans/webhook", null, {
    order_id: order1,
    status_code: "200",
    gross_amount: gross2Str,
    signature_key: signWebhook({
      order_id: order1,
      status_code: "200",
      gross_amount: gross2Str,
      secret: "sig-secret-mock-value",
    }),
    transaction_status: "settlement",
    transaction_id: "mid-tx-dup-1",
  });
  assert.equal(lateDoubleSettlement.httpStatus, 200);
  assert.equal(lateDoubleSettlement.status, "cancelled");

  const doublePaymentAlerts = await db.auditLog.findMany({
    where: { targetId: c1.id, action: "DOUBLE_PAYMENT_ALERT" },
  });
  assert.equal(doublePaymentAlerts.length, 1);

  const settleLogs = await db.auditLog.findMany({
    where: { targetId: c1.id, action: "PAYMENT_SETTLED" },
  });
  assert.equal(settleLogs.length, 1);

  const contractAfterPay = await api(`/contracts/${c1.id}`, admin);
  assert.equal(contractAfterPay.data.payment.status, "paid");
  assert.equal(contractAfterPay.data.payment.escrowStatus, "held");
  assert.equal(contractAfterPay.data.payment.paymentChannel, "bca");
  assert.equal(contractAfterPay.data.payment.paymentReference, "1234567890");
  assert.equal("rawNotification" in contractAfterPay.data.payment, false);
  assert.equal("snapToken" in contractAfterPay.data.payment, false);

  // Scenario 10: Complete Escrow lifecycle: ship -> receive -> escrow released
  const shipped = await api(`/contracts/${c1.id}/ship`, farmer, { notes: "Truk berangkat" });
  assert.equal(shipped.httpStatus, 200);
  assert.equal(shipped.data.status, "shipping");

  const received = await api(`/contracts/${c1.id}/receive`, buyer, { notes: "Timbangan sesuai" });
  assert.equal(received.httpStatus, 200);
  assert.equal(received.data.status, "completed");
  assert.equal(received.data.payment.status, "paid");
  assert.equal(received.data.payment.escrowStatus, "released");
  assert.ok(received.data.payment.releasedAt);

  const farmerNotifs = await db.notification.findMany({
    where: { accountId: farmer.id, contractId: c1.id, title: "Dana Escrow Dicairkan" },
  });
  assert.equal(farmerNotifs.length, 1);

  const releaseAudit = await db.auditLog.findMany({
    where: { targetId: c1.id, action: "ESCROW_RELEASED" },
  });
  assert.equal(releaseAudit.length, 1);

  // Scenario 6b + 11: Sync & 7+3 Day Sweeper tests
  // Contract #2: Passes 7 days -> single reminder; still payable during 3-day grace; then cancel after +3 days
  const c2 = await createSignedContract(50000, 6500);
  const c2Init = await api(`/contracts/${c2.id}/payment/initiate`, buyer, {});
  assert.equal(c2Init.httpStatus, 200);

  const signedAtMs = Date.now();
  await db.contract.update({
    where: { id: c2.id },
    data: {
      paymentDueAt: new Date(signedAtMs - 1000),
      paymentGraceEndsAt: new Date(signedAtMs + PAYMENT_GRACE_MS),
    },
  });

  const reminded1 = await sendPaymentOverdueReminders(db, new Date(signedAtMs + 100));
  assert.ok(reminded1 >= 1);
  const reminded2 = await sendPaymentOverdueReminders(db, new Date(signedAtMs + 200));
  assert.equal(reminded2, 0);

  const c2Notifs = await db.notification.findMany({
    where: { contractId: c2.id, title: { contains: "Masa Tenggang 3 Hari" } },
  });
  assert.equal(c2Notifs.length, 2); // 1 buyer + 1 farmer

  // Now move past +3 day grace period -> sweeper auto-cancels & restores stock!
  await db.contract.update({
    where: { id: c2.id },
    data: { paymentGraceEndsAt: new Date(signedAtMs - 500) },
  });
  const cancelledCount = await cancelUnpaidSignedContracts(db, new Date(signedAtMs));
  assert.ok(cancelledCount >= 1);

  const c2After = await api(`/contracts/${c2.id}`, buyer);
  assert.equal(c2After.data.status, "cancelled");
  assert.equal(c2After.data.cancelReason, AUTO_CANCEL_REASON);
  assert.equal(c2After.data.payment.status, "expired");

  const offerAfterCancel = await api(`/offers/${offer.id}`, farmer);
  // 1,000,000 - 400,000 (c1 completed) - 1,000 (pendingContract) = 599,000 (c2 restored!)
  assert.equal(offerAfterCancel.availableVolumeKg, 599000);

  // Contract #3: Settled at last second at Midtrans right before grace end -> sweeper rescues instead of cancelling!
  const c3 = await createSignedContract(10000, 6500);
  const c3Init = await api(`/contracts/${c3.id}/payment/initiate`, buyer, {});
  const c3Order = c3Init.data.payment.orderId;
  midtransState.nextStatusMode.set(c3Order, {
    httpStatus: 200,
    body: {
      status_code: "200",
      transaction_status: "settlement",
      order_id: c3Order,
      gross_amount: "65325000.00",
      payment_type: "qris",
      acquirer: "gopay",
      transaction_id: "mid-tx-rescue-3",
    },
  });
  await db.contract.update({
    where: { id: c3.id },
    data: {
      paymentDueAt: new Date(Date.now() - PAYMENT_DUE_MS),
      paymentGraceEndsAt: new Date(Date.now() - 1000),
    },
  });
  await cancelUnpaidSignedContracts(db, new Date());
  const c3After = await api(`/contracts/${c3.id}`, buyer);
  assert.equal(c3After.data.status, "signed");
  assert.equal(c3After.data.payment.status, "paid");
  assert.equal(c3After.data.payment.paymentChannel, "gopay");
});
