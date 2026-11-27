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
  const sweep = async () => {
    await expirePending(db).catch(() => console.error("Gagal memproses tenggat kontrak."));
    await expireApprovedUnsignedContracts(db).catch(() =>
      console.error("Gagal memproses tenggat tanda tangan 48 jam.")
    );
    await sendPaymentOverdueReminders(db).catch(() =>
      console.error("Gagal mengirim pengingat masa tenggang pembayaran.")
    );
    await cancelUnpaidSignedContracts(db).catch(() =>
      console.error("Gagal memproses pembatalan otomatis kontrak belum dibayar.")
    );
    await sendShippingOverdueReminders(db).catch(() =>
      console.error("Gagal mengirim pengingat tenggat pengiriman.")
    );
    await cancelUnshippedPaidContracts(db).catch(() =>
      console.error("Gagal memproses kontrak terbayar melewati tenggat kirim.")
    );
    await autoCompleteAndReleaseShippedContracts(db).catch(() =>
      console.error("Gagal memproses penyelesaian otomatis kontrak terkirim.")
    );
    await sendSubscriptionExpiryReminders(db).catch(() =>
      console.error("Gagal mengirim pengingat masa aktif langganan Produsen Pro.")
    );
    await sendSubscriptionExpiredNotices(db).catch(() =>
      console.error("Gagal mengirim pemberitahuan berakhirnya langganan Produsen Pro.")
    );
  };
  void sweep();
  const timer=setInterval(() => { void sweep(); }, 5000);
  timer.unref();
  return ()=>clearInterval(timer);
}
