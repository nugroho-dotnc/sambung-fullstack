import {Router} from "express";
import type {PrismaClient} from "@prisma/client";
import {z} from "zod";
import {sessionHash} from "../auth/session.ts";
import {ApiError} from "../../shared/api-error.ts";
import {command,contracts,detail} from "./contracts.service.ts";
import {actionSchema} from "./contracts.schemas.ts";
export function contractRouter(db:PrismaClient) {
  const router=Router();
  router.use(async(req,res,next)=>{
    res.set("Cache-Control","no-store");
    const s=await db.authSession.findFirst({where:{tokenHash:sessionHash(req),expiresAt:{gt:new Date()},account:{status:"active"}},include:{account:true}});
    if(!s?.account) throw new ApiError(401,"UNAUTHENTICATED","Masuk terlebih dahulu.");
    if(!["petani","pembeli","admin"].includes(s.account.role)) throw new ApiError(403,"FORBIDDEN","Akses terbatas untuk pihak kontrak.");
    res.locals.actor={id:s.account.id,role:s.account.role};next();
  });
  router.get("/",async(req,res)=>res.json({data:await contracts(db,res.locals.actor,z.string().optional().parse(req.query.status))}));
  router.get("/:id",async(req,res)=>res.json({data:await detail(db,res.locals.actor,z.uuid().parse(req.params.id))}));
  router.post("/",async(req,res)=>res.status(201).json({data:await command(db,res.locals.actor,"order",undefined,req.body,req.get("Idempotency-Key")??"")}));
  router.post("/:id/:action",async(req,res)=>{
    if(req.params.action==="confirm") {
      throw new ApiError(410,"LEGACY_ACTION_DISABLED","Konfirmasi langsung telah dinonaktifkan. Lanjutkan melalui tanda tangan kontrak, pembayaran escrow, pengiriman, dan penerimaan barang.");
    }
    const action=actionSchema.exclude(["order"]).parse(req.params.action);
    res.json({data:await command(db,res.locals.actor,action,z.uuid().parse(req.params.id),req.body,req.get("Idempotency-Key")??"")});
  });
  return router;
}
