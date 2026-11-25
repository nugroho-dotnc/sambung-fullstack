import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app.ts";

test("dua sesi OTP, registrasi, batas percobaan dan logout terpisah", async () => {
  assert.ok(process.env.TEST_DATABASE_URL, "Isi TEST_DATABASE_URL dengan DB uji yang telah dimigrasikan.");
  const db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  const server = createApp(db, "http://localhost:3000").listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  async function call(path, body, cookie = "") {
    const response = await fetch(base + "/auth/" + path, {
      method: body ? "POST" : "GET", headers: { "content-type": "application/json", cookie },
      body: body && JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  try {
    const cookies = [];
    for (const role of ["petani", "pembeli"]) {
      const phone = "081" + randomInt(100000000, 999999999);
      const input = { phone, role, name: "Uji " + role, province: "Jawa Timur",
        regency: "Jember", district: "Sumbersari", agreedToTerms: true };
      assert.equal((await call("register", input)).status, 401);
      const request = await call("otp/request", { phone });
      assert.equal(request.status, 200);
      assert.equal((await call("otp/request", { phone })).status, 429);
      const otpCode = request.data.debugHint.slice(-4);
      const verified = await call("otp/verify", { phone, otpCode });
      assert.equal(verified.data.isNewUser, true);
      assert.equal((await call("otp/verify", { phone, otpCode })).status, 401);
      const registered = await call("register", input, verified.cookie);
      assert.equal(registered.data.user.role, role);
      cookies.push(registered.cookie);
    }
    await call("logout", {}, cookies[0]);
    assert.equal((await call("me", undefined, cookies[0])).data.user, null);
    assert.equal((await call("me", undefined, cookies[1])).data.user.role, "pembeli");
    const phone = "081" + randomInt(100000000, 999999999);
    const challenge = await call("otp/request", { phone });
    const otpCode = challenge.data.debugHint.slice(-4);
    for (let i = 0; i < 5; i++) {
      assert.equal((await call("otp/verify", { phone, otpCode: otpCode === "0000" ? "0001" : "0000" })).status, 401);
    }
    assert.equal((await call("otp/verify", { phone, otpCode })).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.$disconnect();
  }
});
