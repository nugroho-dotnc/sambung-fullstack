import type { PrismaClient } from "@prisma/client";
import {
  cancelUnpaidSignedContracts,
  sendPaymentOverdueReminders,
} from "../payments/payments.service.ts";
import {
  sendSubscriptionExpiredNotices,
  sendSubscriptionExpiryReminders,
} from "../subscriptions/subscriptions.service.ts";
import {
  autoCompleteAndReleaseShippedContracts,
  cancelUnshippedPaidContracts,
  expireApprovedUnsignedContracts,
  sendShippingOverdueReminders,
} from "./contracts.deadlines.ts";

export async function expirePending(db: PrismaClient) {
  return db.contract.updateMany({where:{status:"pending",expiresAt:{lte:new Date()}},data:{status:"expired"}});
}
export function startExpiry(db: PrismaClient) {
  let running = false;
  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      await expirePending(db).catch((err) =>
        console.error("Gagal memproses tenggat kontrak.", err)
      );
      await expireApprovedUnsignedContracts(db).catch((err) =>
        console.error("Gagal memproses tenggat tanda tangan 48 jam.", err)
      );
      await sendPaymentOverdueReminders(db).catch((err) =>
        console.error("Gagal mengirim pengingat masa tenggang pembayaran.", err)
      );
      await cancelUnpaidSignedContracts(db).catch((err) =>
        console.error("Gagal memproses pembatalan otomatis kontrak belum dibayar.", err)
      );
      await sendShippingOverdueReminders(db).catch((err) =>
        console.error("Gagal mengirim pengingat tenggat pengiriman.", err)
      );
      await cancelUnshippedPaidContracts(db).catch((err) =>
        console.error("Gagal memproses kontrak terbayar melewati tenggat kirim.", err)
      );
      await autoCompleteAndReleaseShippedContracts(db).catch((err) =>
        console.error("Gagal memproses penyelesaian otomatis kontrak terkirim.", err)
      );
      await sendSubscriptionExpiryReminders(db).catch((err) =>
        console.error("Gagal mengirim pengingat masa aktif langganan Produsen Pro.", err)
      );
      await sendSubscriptionExpiredNotices(db).catch((err) =>
        console.error("Gagal mengirim pemberitahuan berakhirnya langganan Produsen Pro.", err)
      );
    } finally {
      running = false;
    }
  };
  void sweep();
  const timer=setInterval(() => { void sweep(); }, 5000);
  timer.unref();
  return ()=>clearInterval(timer);
}
