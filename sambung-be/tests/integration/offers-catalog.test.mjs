import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../src/app.ts";
import { digest } from "../../src/modules/auth/session.ts";

test("tawaran 1000 kg, dua sesi, retry, perubahan harga dan penarikan", async t => {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith("_test"), "Gunakan database khusus uji");
  const db = new PrismaClient({ datasourceUrl: url });
  let lowerBound = 6500;
  let unavailable = false;
  const ai = createServer((req, res) => {
    if (unavailable) return res.writeHead(503).end();
    if (req.method === "POST") return res.end(JSON.stringify({ event_id: "test" }));
    const value = { grainType:"GKP", region:"Jawa Timur", lowerBound, upperBound:7600,
      medianPrice:7100, ricePrice:13450, rendemen:0.5338, referenceSource:"fixture" };
    res.end("event: complete\ndata: " + JSON.stringify([value]) + "\n\n");
  }).listen(0, "127.0.0.1");
  await once(ai, "listening");
  process.env.AI_BASE_URL = "http://127.0.0.1:" + ai.address().port;
  delete process.env.AI_SNAPSHOT_PATH;
  const app = createApp(db, "http://localhost:3000").listen(0, "127.0.0.1");
  await once(app, "listening");
  t.after(async () => { app.close(); ai.close(); await db.$disconnect(); });
  async function login(role) {
    const user = await db.account.create({data:{role, name:"Uji "+role, phone:randomUUID(),
      province:"Jawa Timur", regency:"Jember", district:"Sumbersari"}});
    const token = randomBytes(32).toString("hex");
    await db.authSession.create({data:{accountId:user.id, phone:user.phone, tokenHash:digest(token),
      expiresAt:new Date(Date.now()+60000)}});
    return "sambung_session="+token;
  }
  const farmer = await login("petani"), buyer = await login("pembeli"), other = await login("petani");
  async function call(path, cookie, body, key=randomUUID(), method=body?"POST":"GET") {
    const res = await fetch("http://127.0.0.1:"+app.address().port+path,{method,
      headers:{cookie,"Content-Type":"application/json","Idempotency-Key":key}, body:body && JSON.stringify(body)});
    return {status:res.status,data:await res.json()};
  }
  const input = {districtId:"Sumbersari",grainType:"GKP",quality:22,totalVolumeKg:1000,askPrice:5000};
  const key = randomUUID();
  const [a,b] = await Promise.all([call("/offers",farmer,input,key),call("/offers",farmer,input,key)]);
  assert.equal(a.status,201,JSON.stringify(a)); assert.deepEqual(a,b);
  assert.equal((await call("/offers",farmer,{...input,askPrice:5100},key)).status,409);
  const path="/offers/"+a.data.id, catalog="/catalog/"+a.data.id;
  assert.equal((await call(path,other)).status,404);
  assert.equal((await call(path,buyer)).status,403);
  assert.equal((await call(catalog,buyer)).status,404);
  assert.equal((await call(path,farmer,{...input,version:99},randomUUID(),"PATCH")).status,409);
  const update=await call(path,farmer,{...input,version:1,notes:"Panen pagi"},randomUUID(),"PATCH");
  assert.equal(update.data.version,2);
  const quote = {regionId:"Sumbersari",grainType:"GKP",quality:22,price:5000};
  const check = async () => (await call("/price-checks/preview","",quote)).data;
  const first = await check();
  assert.equal(first.light,"merah");
  const publish = {version:2,referenceVersion:first.reference.referenceVersion};
  assert.equal((await call(path+"/publish",farmer,publish)).data.code,"RED_CONFIRMATION_REQUIRED");
  lowerBound=6600;
  assert.equal((await call(path+"/publish",farmer,{...publish,redConfirmed:true})).data.code,"REFERENCE_CHANGED");
  publish.referenceVersion=(await check()).reference.referenceVersion;
  publish.redConfirmed=true;
  unavailable=true;
  assert.equal((await call(path+"/publish",farmer,publish)).status,503);
  assert.equal((await call(path,farmer)).data.status,"draft");
  unavailable=false;
  const publishKey=randomUUID();
  const published=await call(path+"/publish",farmer,publish,publishKey);
  assert.equal(published.status,200,JSON.stringify(published));
  unavailable=true;
  assert.deepEqual(await call(path+"/publish",farmer,publish,publishKey),published);
  const visible=(await call(catalog,buyer)).data.data;
  assert.equal(visible.availableVolumeKg,1000); assert.equal(visible.askPrice,5000);
  assert.equal(visible.priceCheck.reference.bounds.lowerOperational,6600);
  assert.ok((await call("/catalog?district=Sumbersari",buyer)).data.data.some(row=>row.id===a.data.id));
  assert.equal((await call(path+"/withdraw",farmer,{version:3})).status,200);
  assert.equal((await call(catalog,buyer)).status,404);
  process.env.AI_SNAPSHOT_PATH="../sambung-fe/data/ai/fair_price_params.json";
  const fallback=await check();
  assert.equal(fallback.reference.sourceMode,"snapshot");
  assert.ok(fallback.reference.sourceDate);
});
