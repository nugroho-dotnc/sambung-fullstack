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

    const resUpdateParams = await fetch(`${base}/admin/parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, Cookie: adminCookie },
      body: JSON.stringify({ orderExpiryHours: 48, fairPriceToleranceDelta: 0.04 }),
    });
    assert.equal(resUpdateParams.status, 200);
    const updatedParams = await resUpdateParams.json();
    assert.equal(updatedParams.orderExpiryHours, 48);
    assert.equal(updatedParams.fairPriceToleranceDelta, 0.04);

    // Kembalikan ke 24 jam
    await fetch(`${base}/admin/parameters`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, Cookie: adminCookie },
      body: JSON.stringify({ orderExpiryHours: 24, fairPriceToleranceDelta: 0.03 }),
    });

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
