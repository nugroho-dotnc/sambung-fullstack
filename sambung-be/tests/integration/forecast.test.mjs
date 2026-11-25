import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../src/app.ts";
import { prisma } from "../../src/db/prisma.ts";

test("integrasi prakiraan AI - pemanggilan endpoint, parameter, dan metadata", async () => {
  const origin = "http://localhost:3000";
  const app = createApp(prisma, origin);
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Ambil metadata prakiraan
    const resMeta = await fetch(`${base}/forecasts/meta`, {
      headers: { Origin: origin },
    });
    assert.equal(resMeta.status, 200);
    const meta = await resMeta.json();
    assert.ok(meta.modelVersion);
    assert.ok(meta.latestObservationWeek);
    assert.ok(Array.isArray(meta.activeProvinces));
    assert.ok(meta.activeProvinces.includes("Jawa Timur"));
    assert.ok(["live", "snapshot"].includes(meta.sourceMode));

    // 2. Ambil prakiraan Jawa Timur 2 pekan
    const resJatim2w = await fetch(`${base}/forecasts?province=Jawa%20Timur&horizonWeeks=2`, {
      headers: { Origin: origin },
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

    // 3. Validasi horizon tidak valid (misal: 3 pekan) harus ditolak 422
    const resInvalid = await fetch(`${base}/forecasts?horizonWeeks=3`, {
      headers: { Origin: origin },
    });
    assert.equal(resInvalid.status, 422);

    // 4. Wilayah yang tidak ada dalam basis data harus mengembalikan 404
    const resNotFound = await fetch(`${base}/forecasts?province=Atlantis&horizonWeeks=2`, {
      headers: { Origin: origin },
    });
    assert.equal(resNotFound.status, 404);
  } finally {
    server.close();
  }
});
