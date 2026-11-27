export const SIGN_DEADLINE_MS = 48 * 3_600_000;
export const SHIPPING_DEADLINE_MS = 7 * 86_400_000;
export const SHIPPING_REMINDER_LEAD_MS = 24 * 3_600_000;
export const RECEIPT_AUTO_RELEASE_MS = 5 * 86_400_000;

export const SIGN_EXPIRED_REASON =
  "Batas waktu tanda tangan kesepakatan (48 jam) berakhir.";
export const SHIPPING_OVERDUE_CANCEL_REASON =
  "Petani melewati batas waktu pengiriman 7 hari setelah pembayaran escrow lunas.";
export const SHIPPING_OVERDUE_DISPUTE_REASON =
  "Pembayaran escrow lunas tetapi pengiriman melewati batas 7 hari. Menunggu pengawas memproses pengembalian dana.";
export const AUTO_COMPLETE_HANDOVER_NOTE =
  "Diselesaikan otomatis oleh sistem karena pembeli tidak mengonfirmasi penerimaan atau mengajukan keberatan dalam 5 hari sejak pengiriman.";
