import { Router, type Request } from "express";
import type { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { sessionHash } from "../auth/session.ts";
import { ApiError } from "../../shared/api-error.ts";
import { include, present, mutate } from "./offers.service.ts";
import { preview, reference, referenceInput, previewInput } from "../pricing/pricing.service.ts";

export function marketRouter(db: PrismaClient) {
  const router = Router();
  async function actor(req:Request,role?:string) {
    const session=await db.authSession.findFirst({where:{tokenHash:sessionHash(req),expiresAt:{gt:new Date()},
      account:{status:"active"}},include:{account:true}});
    if(!session?.account) throw new ApiError(401,"UNAUTHENTICATED","Masuk terlebih dahulu.");
    if(role && session.account.role!==role && session.account.role!=="admin") throw new ApiError(403,"FORBIDDEN","Peran akun tidak memiliki akses.");
    return session.account;
  }
  router.get("/regions",async (req,res)=>{
    const q=z.object({level:z.enum(["provinsi","kabupaten","kecamatan"]).optional(),parentId:z.string().optional()}).parse(req.query);
    const rows=await db.region.findMany({orderBy:{id:"asc"}});
    const all=new Map<string,{id:string,name:string,level:string,parentId:string|null,province:string,regency:string}>();
    for(const row of rows) {
      all.set(`provinsi:${row.province}`,{...row,id:row.province,name:row.province,level:"provinsi",parentId:null});
      all.set(`kabupaten:${row.province}:${row.regency}`,{...row,id:row.regency,name:row.regency,level:"kabupaten",parentId:row.province});
      all.set(`kecamatan:${row.id}`,{...row,name:row.id,level:"kecamatan",parentId:row.regency});
    }
    res.json({data:Array.from(all.values()).filter(r=>(!q.level||r.level===q.level)&&(!q.parentId||r.parentId===q.parentId))});
  });
  router.get("/fair-price-references",async(req,res)=>{res.json(await reference(db,referenceInput.parse(req.query)));});
  router.post("/price-checks/preview",async(req,res)=>{res.json(await preview(db,previewInput.parse(req.body)));});
  router.use(["/offers","/catalog"],(_req,res,next)=>{res.set("Cache-Control","no-store");next();});
  router.get("/offers",async(req,res)=>{
    const user=await actor(req);
    if(user.role!=="petani" && user.role!=="admin") throw new ApiError(403,"FORBIDDEN","Peran akun tidak memiliki akses.");
    const where = user.role === "admin" ? {} : { ownerId: user.id };
    res.json({data:(await db.offer.findMany({where,include,orderBy:{updatedAt:"desc"}})).map(present)});
  });
  router.get("/offers/:id",async(req,res)=>{
    const user=await actor(req);
    if(user.role!=="petani" && user.role!=="admin") throw new ApiError(403,"FORBIDDEN","Peran akun tidak memiliki akses.");
    const where = user.role === "admin" ? { id: z.uuid().parse(req.params.id) } : { id: z.uuid().parse(req.params.id), ownerId: user.id };
    const row=await db.offer.findFirst({where,include});
    if(!row) throw new ApiError(404,"NOT_FOUND","Tawaran tidak ditemukan.");
    res.json(present(row));
  });
  for(const [action,path] of [["create","/offers"],["update","/offers/:id"],["withdraw","/offers/:id/withdraw"],["publish","/offers/:id/publish"]] as const){
    router[action==="update"?"patch":"post"](path,async(req,res)=>{
      const owner=(await actor(req,"petani")).id;
      const id="id" in req.params ? z.uuid().parse(req.params.id) : undefined;
      const result=await mutate(db,owner,action,id,req.get("Idempotency-Key")??"",req.body);
      res.status(action==="create"?201:200).json(result);
    });
  }
  router.get("/catalog",async(req,res)=>{
    await actor(req,"pembeli");
    const q=z.object({grainType:z.enum(["GKP","GKG"]).optional(),district:z.string().optional(),
      regency:z.string().optional(),search:z.string().optional(),minVolumeKg:z.coerce.number().optional(),
      maxPrice:z.coerce.number().optional()}).parse(req.query);
    const search:Prisma.StringFilter={contains:q.search,mode:"insensitive"};
    const where:Prisma.OfferWhereInput={status:"published",grainType:q.grainType,districtId:q.district,
      region:{regency:q.regency},totalVolumeKg:{gte:q.minVolumeKg},askPrice:{lte:q.maxPrice},
      OR:q.search?[{grainType:search},{districtId:search},{region:{regency:search}},{owner:{name:search}}]:undefined};
    res.json({data:(await db.offer.findMany({where,include,orderBy:{updatedAt:"desc"}})).map(present).filter(o=>o.availableVolumeKg>0 && o.availableVolumeKg >= (q.minVolumeKg ?? 0))});
  });
  router.get("/catalog/:id",async(req,res)=>{
    await actor(req,"pembeli");
    const row=await db.offer.findFirst({where:{id:z.uuid().parse(req.params.id),status:"published"},include});
    if(!row) throw new ApiError(404,"NOT_FOUND","Tawaran tidak tersedia.");
    res.json({data:present(row)});
  });
  return router;
}
