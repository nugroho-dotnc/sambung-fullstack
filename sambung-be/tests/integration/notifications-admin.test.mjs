import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../src/app.ts";
import { prisma } from "../../src/db/prisma.ts";
import { createSession } from "../../src/modules/auth/session.ts";

test("integrasi modul admin dan notifikasi", async () => {
  const origin = "http://localhost:3000";
  const app = createApp(prisma, origin);
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Login Admin berhasil
    const resLogin = await fetch(`${base}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ email: "admin@sambung.id", password: "admin123" }),
    });
    assert.equal(resLogin.status, 200);
    const loginBody = await resLogin.json();
    assert.equal(loginBody.success, true);
    assert.equal(loginBody.user.role, "admin");
    assert.equal("passwordHash" in loginBody.user, false);

    const adminCookie = resLogin.headers.get("set-cookie")?.split(";")[0];
    assert.ok(adminCookie);

    // 2. Admin membaca statistik
    const resStats = await fetch(`${base}/admin/stats`, {
      headers: { Origin: origin, Cookie: adminCookie },
    });
    assert.equal(resStats.status, 200);
    const stats = await resStats.json();
    assert.ok(typeof stats.registeredUsers === "number");
    assert.ok(typeof stats.totalVolumeKg === "number");
    assert.equal(stats.dataFreshnessStatus, "Aktif & Valid");

    // 3. Admin membaca dan memperbarui parameter sistem
    const resParams = await fetch(`${base}/admin/parameters`, {
      headers: { Origin: origin, Cookie: adminCookie },
    });
    assert.equal(resParams.status, 200);
    const params = await resParams.json();
    assert.equal(params.orderExpiryHours, 24);

    try {
      const resUpdateParams = await fetch(`${base}/admin/parameters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin, Cookie: adminCookie },
        body: JSON.stringify({ orderExpiryHours: 48, fairPriceToleranceDelta: 0.04 }),
      });
      assert.equal(resUpdateParams.status, 200);
      const updatedParams = await resUpdateParams.json();
      assert.equal(updatedParams.orderExpiryHours, 48);
      assert.equal(updatedParams.fairPriceToleranceDelta, 0.04);
    } finally {
      // Kembalikan ke 24 jam
      await fetch(`${base}/admin/parameters`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin, Cookie: adminCookie },
        body: JSON.stringify({ orderExpiryHours: 24, fairPriceToleranceDelta: 0.03 }),
      });
    }

    // 4. Admin membaca audit logs
    const resAudit = await fetch(`${base}/admin/audit-logs`, {
      headers: { Origin: origin, Cookie: adminCookie },
    });
    assert.equal(resAudit.status, 200);
    const auditLogs = await resAudit.json();
    assert.ok(Array.isArray(auditLogs));
    assert.ok(auditLogs.some((l) => l.action === "UPDATE_PARAMETERS"));

    // 5. Akun non-admin (misal: petani) ditolak saat mengakses endpoint admin
    const farmer = await prisma.account.findUniqueOrThrow({ where: { phone: "6281234567890" } });
    const farmerSession = await prisma.$transaction((tx) =>
      createSession(tx, farmer.phone, farmer.id)
    );
    const farmerCookie = `sambung_session=${farmerSession.token}`;

    const resForbidden = await fetch(`${base}/admin/stats`, {
      headers: { Origin: origin, Cookie: farmerCookie },
    });
    assert.equal(resForbidden.status, 403);

    // 6. GET /admin/users menyamarkan nomor telepon dan tidak membocorkan passwordHash
    const resUsers = await fetch(`${base}/admin/users`, {
      headers: { Origin: origin, Cookie: adminCookie },
    });
    assert.equal(resUsers.status, 200);
    const adminUsers = await resUsers.json();
    assert.ok(Array.isArray(adminUsers) && adminUsers.length > 0);
    for (const account of adminUsers) {
      assert.equal("passwordHash" in account, false);
    }
    const listedFarmer = adminUsers.find((u) => u.id === farmer.id);
    assert.ok(listedFarmer);
    assert.equal(listedFarmer.phone.includes("6281234567890"), false);
    assert.match(listedFarmer.phone, /\*{4}/);

    // 7. Moderasi tawaran terpisah dari draft & mengirim notifikasi petani
    const statsBeforeRes = await fetch(`${base}/admin/stats`, {
      headers: { Origin: origin, Cookie: adminCookie },
    });
    assert.equal(statsBeforeRes.status, 200);
    const statsBefore = await statsBeforeRes.json();

    const region = await prisma.region.findFirstOrThrow();
    const createOfferKey = crypto.randomUUID();
    const moderationIssueNote = `Uji moderasi ${createOfferKey.slice(0, 8)}`;
    let createdOfferId = null;

    try {
      const resCreateDraft = await fetch(`${base}/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: farmerCookie,
          "Idempotency-Key": createOfferKey,
        },
        body: JSON.stringify({
          districtId: region.id,
          grainType: "GKP",
          totalVolumeKg: 250,
          askPrice: 6500,
          quality: 22,
          notes: "Draft uji moderasi H-1",
        }),
      });
      assert.equal(resCreateDraft.status, 201);
      const draftOffer = await resCreateDraft.json();
      createdOfferId = draftOffer.id;

      const statsAfterDraftRes = await fetch(`${base}/admin/stats`, {
        headers: { Origin: origin, Cookie: adminCookie },
      });
      const statsAfterDraft = await statsAfterDraftRes.json();
      assert.equal(statsAfterDraft.flaggedOffers, statsBefore.flaggedOffers);

      const resFlag = await fetch(`${base}/admin/moderation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          offerId: createdOfferId,
          action: "request_fix",
          note: moderationIssueNote,
        }),
      });
      assert.equal(resFlag.status, 200);
      const flaggedPayload = await resFlag.json();
      assert.equal(flaggedPayload.offer.moderationStatus, "Sedang diminta perbaikan");
      assert.equal(flaggedPayload.offer.moderationIssue, moderationIssueNote);

      const statsFlaggedRes = await fetch(`${base}/admin/stats`, {
        headers: { Origin: origin, Cookie: adminCookie },
      });
      const statsFlagged = await statsFlaggedRes.json();
      assert.equal(statsFlagged.flaggedOffers, statsBefore.flaggedOffers + 1);

      const resFarmerNotifs = await fetch(`${base}/notifications`, {
        headers: { Origin: origin, Cookie: farmerCookie },
      });
      assert.equal(resFarmerNotifs.status, 200);
      const farmerNotifs = await resFarmerNotifs.json();
      assert.ok(
        farmerNotifs.data.some(
          (n) => n.type === "pasar" && String(n.description).includes(moderationIssueNote)
        )
      );

      const resResolve = await fetch(`${base}/admin/moderation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          offerId: createdOfferId,
          action: "resolve",
        }),
      });
      assert.equal(resResolve.status, 200);
      const resolvedPayload = await resResolve.json();
      assert.equal(resolvedPayload.offer.moderationStatus, null);
      assert.equal(resolvedPayload.offer.moderationIssue, null);

      const statsResolvedRes = await fetch(`${base}/admin/stats`, {
        headers: { Origin: origin, Cookie: adminCookie },
      });
      const statsResolved = await statsResolvedRes.json();
      assert.equal(statsResolved.flaggedOffers, statsBefore.flaggedOffers);
    } finally {
      await prisma.notification.deleteMany({
        where: { accountId: farmer.id, type: "pasar", description: { contains: moderationIssueNote } },
      });
      if (createdOfferId) {
        await prisma.auditLog.deleteMany({ where: { targetId: createdOfferId } });
        await prisma.offer.deleteMany({ where: { id: createdOfferId } });
      }
      await prisma.offerRequest.deleteMany({
        where: { ownerId: farmer.id, key: createOfferKey },
      });
    }

    // 8. Perubahan fairPriceToleranceDelta di parameter langsung memengaruhi deltaBp kalkulator (tanpa race DB paralel)
    const prevParamRes = await fetch(`${base}/admin/parameters`, {
      headers: { Origin: origin, Cookie: adminCookie },
    });
    assert.equal(prevParamRes.status, 200);
    const prevParam = await prevParamRes.json();

    const basePreviewRes = await fetch(`${base}/price-checks/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        regionId: region.id,
        grainType: "GKP",
        quality: 22,
        price: 6500,
      }),
    });
    assert.equal(basePreviewRes.status, 200);
    const basePreview = await basePreviewRes.json();
    assert.equal(basePreview.reference.deltaBp, Math.round(prevParam.fairPriceToleranceDelta * 10000));

    const scopedDb = {
      region: prisma.region,
      systemParameter: {
        findUnique: async () => ({ fairPriceToleranceDelta: 0.05 }),
      },
    };
    const previewApp = createApp(scopedDb, origin);
    const previewServer = previewApp.listen(0);
    try {
      const previewAddr = previewServer.address();
      assert.ok(previewAddr && typeof previewAddr === "object");
      const resPreview = await fetch(`http://127.0.0.1:${previewAddr.port}/price-checks/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({
          regionId: region.id,
          grainType: "GKP",
          quality: 22,
          price: 6500,
        }),
      });
      assert.equal(resPreview.status, 200);
      const previewData = await resPreview.json();
      assert.equal(previewData.reference.deltaBp, 500);
    } finally {
      previewServer.close();
    }

    // 9. Validasi Zod mengembalikan 422 INVALID_INPUT beserta fieldErrors
    const resInvalidCancel = await fetch(
      `${base}/contracts/00000000-0000-4000-8000-000000000000/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          Cookie: farmerCookie,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ reason: "ab" }),
      }
    );
    assert.equal(resInvalidCancel.status, 422);
    const invalidCancelBody = await resInvalidCancel.json();
    assert.equal(invalidCancelBody.code, "INVALID_INPUT");
    assert.ok(Array.isArray(invalidCancelBody.fieldErrors?.reason));
    assert.ok(invalidCancelBody.fieldErrors.reason.length > 0);

    // 10. Multi-origin FE_ORIGIN mengizinkan origin terdaftar dan menolak origin asing
    const secondOrigin = "https://sambung.id";
    const multiApp = createApp(prisma, `${origin}, ${secondOrigin}`);
    const multiServer = multiApp.listen(0);
    try {
      const addr = multiServer.address();
      assert.ok(addr && typeof addr === "object");
      const multiBase = `http://127.0.0.1:${addr.port}`;

      const resAllowedSecond = await fetch(`${multiBase}/health`, {
        headers: { Origin: secondOrigin },
      });
      assert.equal(resAllowedSecond.status, 200);
      assert.equal(resAllowedSecond.headers.get("access-control-allow-origin"), secondOrigin);

      const resDeniedOrigin = await fetch(`${multiBase}/health`, {
        headers: { Origin: "https://evil.example" },
      });
      assert.equal(resDeniedOrigin.status, 403);
      const deniedBody = await resDeniedOrigin.json();
      assert.equal(deniedBody.code, "ORIGIN_DENIED");
    } finally {
      multiServer.close();
    }

    // 6. Buat notifikasi untuk petani dan verifikasi endpoint notifikasi
    const createdNotif = await prisma.notification.create({
      data: {
        accountId: farmer.id,
        type: "kontrak",
        title: "Uji Notifikasi Masuk",
        description: "Ini adalah notifikasi uji coba sistem.",
        linkHref: "/kontrak",
      },
    });

    const resNotifs = await fetch(`${base}/notifications`, {
      headers: { Origin: origin, Cookie: farmerCookie },
    });
    assert.equal(resNotifs.status, 200);
    const notifs = await resNotifs.json();
    assert.ok(Array.isArray(notifs.data));
    const found = notifs.data.find((n) => n.id === createdNotif.id);
    assert.ok(found);
    assert.equal(found.isRead, false);

    // 7. Tandai notifikasi sebagai terbaca
    const resRead = await fetch(`${base}/notifications/${createdNotif.id}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, Cookie: farmerCookie },
      body: JSON.stringify({}),
    });
    assert.equal(resRead.status, 200);
    const readBody = await resRead.json();
    assert.equal(readBody.data.isRead, true);

    // Bersihkan notifikasi uji
    await prisma.notification.delete({ where: { id: createdNotif.id } });
  } finally {
    server.close();
  }
});
