import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeSubscriptionReturnPath } from "./return-path.ts";

test("sanitizeSubscriptionReturnPath allows safe internal workspace routes only", () => {
  assert.equal(sanitizeSubscriptionReturnPath("/peta"), "/peta");
  assert.equal(sanitizeSubscriptionReturnPath("/peta/tabel"), "/peta/tabel");
  assert.equal(sanitizeSubscriptionReturnPath("/pembeli/katalog"), "/pembeli/katalog");
  assert.equal(sanitizeSubscriptionReturnPath("/harga?region=Jawa%20Timur"), "/harga?region=Jawa%20Timur");

  assert.equal(sanitizeSubscriptionReturnPath(null), null);
  assert.equal(sanitizeSubscriptionReturnPath(undefined), null);
  assert.equal(sanitizeSubscriptionReturnPath(""), null);
  assert.equal(sanitizeSubscriptionReturnPath("   "), null);
  assert.equal(sanitizeSubscriptionReturnPath("peta"), null);
  assert.equal(sanitizeSubscriptionReturnPath("https://evil.com/peta"), null);
  assert.equal(sanitizeSubscriptionReturnPath("//evil.com"), null);
  assert.equal(sanitizeSubscriptionReturnPath("/\\evil.com"), null);
  assert.equal(sanitizeSubscriptionReturnPath("javascript:alert(1)"), null);
  assert.equal(sanitizeSubscriptionReturnPath("/langganan"), null);
  assert.equal(sanitizeSubscriptionReturnPath("/langganan?from=/peta"), null);
  assert.equal(sanitizeSubscriptionReturnPath("/langganan/riwayat"), null);
});
