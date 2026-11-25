import type { PrismaClient } from "@prisma/client";
export async function expirePending(db: PrismaClient) {
  return db.contract.updateMany({where:{status:"pending",expiresAt:{lte:new Date()}},data:{status:"expired"}});
}
export function startExpiry(db: PrismaClient) {
  const sweep=()=>expirePending(db).catch(()=>console.error("Gagal memproses tenggat kontrak."));
  void sweep();
  const timer=setInterval(sweep,5000);
  timer.unref();
  return ()=>clearInterval(timer);
}
