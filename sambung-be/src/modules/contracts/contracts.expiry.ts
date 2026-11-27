import type { PrismaClient } from "@prisma/client";
import {
  cancelUnpaidSignedContracts,
  sendPaymentOverdueReminders,
} from "../payments/payments.service.ts";

export async function expirePending(db: PrismaClient) {
  return db.contract.updateMany({where:{status:"pending",expiresAt:{lte:new Date()}},data:{status:"expired"}});
}
export function startExpiry(db: PrismaClient) {
  const sweep = async () => {
    await expirePending(db).catch(() => console.error("Gagal memproses tenggat kontrak."));
    await sendPaymentOverdueReminders(db).catch(() =>
      console.error("Gagal mengirim pengingat masa tenggang pembayaran.")
    );
    await cancelUnpaidSignedContracts(db).catch(() =>
      console.error("Gagal memproses pembatalan otomatis kontrak belum dibayar.")
    );
  };
  void sweep();
  const timer=setInterval(() => { void sweep(); }, 5000);
  timer.unref();
  return ()=>clearInterval(timer);
}
