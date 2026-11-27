import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app.ts";
import { digest } from "../../src/modules/auth/session.ts";

test("integrasi prakiraan AI - pemanggilan endpoint, parameter, dan metadata", async () => {
  const origin = "http://localhost:3000";
  const testUrl = process.env.TEST_DATABASE_URL;
  assert.ok(testUrl && new URL(testUrl).pathname.endsWith("_test"), "Gunakan TEST_DATABASE_URL khusus uji (_test).");
  const db = new PrismaClient({ datasourceUrl: testUrl });
  const app = createApp(db, origin);
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  let accountId = null;

  try {
    // 1. Ambil metadata prakiraan (tetap terbuka)
    const resMeta = await fetch(`${base}/forecasts/meta`, {
      headers: { Origin: origin },
    });
    assert.equal(resMeta.status, 200);
    const meta = await resMeta.json();
    assert.ok(meta.modelVersion);
    assert.ok(meta.latestObservationWeek);
    assert.ok(Array.isArray(meta.activeProvinces));
    assert.ok(meta.activeProvinces.includes("Jawa Timur"));
    assert.equal(meta.sourceMode, "live");

    // 2. Tanpa sesi login -> 401 UNAUTHENTICATED
    const resAnon = await fetch(`${base}/forecasts?province=Jawa%20Timur&horizonWeeks=2`, {
      headers: { Origin: origin },
    });
    assert.equal(resAnon.status, 401);
    const anonBody = await resAnon.json();
    assert.equal(anonBody.code, "UNAUTHENTICATED");

    const farmer = await db.account.create({
      data: {
        role: "petani",
        name: "Petani Uji Prakiraan",
        phone: `62855${randomUUID().replace(/\D/g, "").slice(0, 8)}`,
        province: "Jawa Timur",
        regency: "Jember",
        district: "Sumbersari",
      },
    });
    accountId = farmer.id;
    const token = randomBytes(32).toString("hex");
    await db.authSession.create({
      data: {
        phone: farmer.phone,
        accountId,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + 120_000),
      },
    });
    const cookie = `sambung_session=${token}`;

    // 3. Ambil prakiraan Jawa Timur 2 pekan dengan sesi aktif
    const resJatim2w = await fetch(`${base}/forecasts?province=Jawa%20Timur&horizonWeeks=2`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(resJatim2w.status, 200);
    const jatim2w = await resJatim2w.json();
    assert.ok(jatim2w.records.length >= 1);
    const rec = jatim2w.records[0];
    assert.equal(rec.province, "Jawa Timur");
    assert.equal(rec.horizonWeeks, 2);
    assert.ok(rec.riceProducerPrice > 0);
    assert.ok(rec.gkpEstimate > 0);
    assert.ok(rec.gkgEstimate > 0);
    assert.ok(rec.confidenceInterval80[0] <= rec.confidenceInterval80[1]);
    assert.ok(Array.isArray(rec.shapContributions));
    assert.ok(rec.shapContributions.length > 0);

    // 4. Validasi horizon tidak valid (misal: 3 pekan) harus ditolak 422
    const resInvalid = await fetch(`${base}/forecasts?horizonWeeks=3`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(resInvalid.status, 422);

    // 5. Wilayah yang tidak ada dalam basis data harus mengembalikan 404
    const resNotFound = await fetch(`${base}/forecasts?province=Atlantis&horizonWeeks=2`, {
      headers: { Origin: origin, Cookie: cookie },
    });
    assert.equal(resNotFound.status, 404);
  } finally {
    server.close();
    try {
      if (accountId) {
        await db.authSession.deleteMany({ where: { accountId } });
        await db.account.deleteMany({ where: { id: accountId } });
      }
    } finally {
      await db.$disconnect();
    }
  }
});
