import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID,randomBytes} from "node:crypto";
import {once} from "node:events";
import {PrismaClient} from "@prisma/client";
import {createApp} from "../../src/app.ts";
import {digest} from "../../src/modules/auth/session.ts";
import {startExpiry} from "../../src/modules/contracts/contracts.expiry.ts";

test("kontrak dua pihak, reservasi serentak, tenggat, akses dan retry",async t=>{
  const url=process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith("_test"));
  const db=new PrismaClient({datasourceUrl:url});
  process.env.AI_BASE_URL="http://127.0.0.1:1";
  process.env.AI_SNAPSHOT_PATH="../sambung-fe/data/ai/fair_price_params.json";
  const app=createApp(db,"http://localhost:3000").listen(0,"127.0.0.1");
  await once(app,"listening");
  t.after(async()=>{app.close();await db.$disconnect();});
  async function login(role){
    const person=await db.account.create({data:{name:role,role,phone:randomUUID(),province:"Jawa Timur",regency:"Jember",district:"Sumbersari"}});
    const token=randomBytes(32).toString("hex");
    await db.authSession.create({data:{phone:person.phone,accountId:person.id,tokenHash:digest(token),expiresAt:new Date(Date.now()+120000)}});
    return {id:person.id,cookie:"sambung_session="+token};
  }
  const farmer=await login("petani"),buyer=await login("pembeli"),other=await login("pembeli");
  async function api(path,user,body,key=randomUUID()){
    const res=await fetch("http://127.0.0.1:"+app.address().port+path,{method:body?"POST":"GET",
      headers:{cookie:user.cookie,"Content-Type":"application/json","Idempotency-Key":key},body:body && JSON.stringify(body)});
    const json=await res.json();
    return {...json,status:res.status};
  }
  const offer=await db.offer.create({data:{districtId:"Sumbersari",grainType:"GKP",totalVolumeKg:1000,
    askPrice:7000,quality:22,ownerId:farmer.id,status:"published"}});
  const stock=async()=> (await api("/offers/"+offer.id,farmer)).availableVolumeKg;
  async function price(action,value){
    const ref=await api("/price-checks/preview",buyer,{regionId:"Sumbersari",quality:22,grainType:"GKP",action,price:value});
    return {referenceVersion:ref.reference.referenceVersion,redConfirmed:ref.requiresConfirmation};
  }
  const input={offerId:offer.id,volumeKg:300,proposedPrice:6500,...await price("order",6500)};
  const key=randomUUID();
  const [first,retry]=await Promise.all([api("/contracts",buyer,input,key),api("/contracts",buyer,input,key)]);
  assert.equal(first.status,201,JSON.stringify(first));assert.equal(first.data.id,retry.data.id);
  assert.equal(first.data.farmerPhone,undefined);assert.equal(await stock(),700);
  const path="/contracts/"+first.data.id;
  assert.equal((await api(path,other)).status,404);
  const red={priceOfferVersion:1,proposedPrice:5000,...await price("counter",5000)};
  assert.equal((await api(path+"/counter",farmer,{...red,redConfirmed:false})).code,"RED_CONFIRMATION_REQUIRED");
  const counter=await api(path+"/counter",farmer,{priceOfferVersion:1,proposedPrice:6800,...await price("counter",6800)});
  assert.equal(counter.data.priceOfferVersion,2);assert.equal(counter.data.history.length,2);
  const accept={...await price("accept",6800),priceOfferVersion:2};
  assert.equal((await api(path+"/accept",buyer,{...accept,priceOfferVersion:1})).code,"VERSION_CONFLICT");
  const accepted=await api(path+"/accept",buyer,accept);
  assert.equal(accepted.data.status,"approved");assert.ok(accepted.data.farmerPhone);
  for(let n=0;n<2;n++) assert.equal((await api(path+"/confirm",farmer,{})).data.status,"approved");
  const done=await api(path+"/confirm",buyer,{});
  assert.equal(done.data.status,"completed");assert.equal(done.data.farmerPhone,undefined);
  assert.equal(await stock(),700);
  const race=await Promise.all([buyer,other].map(u=>api("/contracts",u,{...input,volumeKg:600})));
  assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);assert.equal(await stock(),100);
  const winner=race.find(r=>r.status===201).data;
  const cancelKey=randomUUID();
  for(let n=0;n<2;n++)assert.equal((await api("/contracts/"+winner.id+"/cancel",winner.buyerId===buyer.id?buyer:other,
    {reason:"Uji batal"},cancelKey)).data.status,"cancelled");
  assert.equal(await stock(),700);
  async function make(){return (await api("/contracts",buyer,input)).data.id;}
  const rejected=await make();
  assert.equal((await api("/contracts/"+rejected+"/reject",farmer,{reason:"Uji tolak"})).data.status,"rejected");
  assert.equal(await stock(),700);
  const expired=await make();
  await db.contract.update({where:{id:expired},data:{expiresAt:new Date()}});
  assert.equal((await api("/contracts/"+expired+"/accept",farmer,{priceOfferVersion:1,...await price("accept",6500)})).code,"EXPIRED");
  const stop=startExpiry(db);
  try{
    for(let n=0;n<30 && (await db.contract.findUnique({where:{id:expired}})).status==="pending";n++)
      await new Promise(r=>setTimeout(r,20));
    assert.equal((await db.contract.findUnique({where:{id:expired}})).status,"expired");
  }finally{stop();}
  assert.equal(await stock(),700);
  const interrupted=await make();
  await api("/contracts/"+interrupted+"/accept",farmer,{priceOfferVersion:1,...await price("accept",6500)});
  await api("/contracts/"+interrupted+"/confirm",buyer,{});
  assert.equal((await api("/contracts/"+interrupted+"/cancel",farmer,{reason:"Kendala di lapangan"})).data.status,"cancelled");
  assert.equal(await stock(),700);
  const active=await make();
  await api("/contracts/"+active+"/accept",farmer,{priceOfferVersion:1,...await price("accept",6500)});
  const pending=await make();
  const withdrawn=await api("/offers/"+offer.id+"/withdraw",farmer,{version:1});
  assert.equal(withdrawn.status,200);
  assert.equal((await api("/contracts/"+pending,buyer)).data.status,"cancelled");
  assert.equal((await api("/contracts/"+active,buyer)).data.status,"approved");
  assert.equal(withdrawn.completedVolumeKg,300);assert.equal(withdrawn.approvedVolumeKg,300);
});

