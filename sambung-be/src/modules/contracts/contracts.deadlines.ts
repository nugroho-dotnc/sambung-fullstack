import type { PrismaClient } from "@prisma/client";
import {
  AUTO_COMPLETE_HANDOVER_NOTE,
  SHIPPING_OVERDUE_CANCEL_REASON,
  SHIPPING_OVERDUE_DISPUTE_REASON,
  SHIPPING_REMINDER_LEAD_MS,
  SIGN_EXPIRED_REASON,
} from "./contracts.constants.ts";

function formatIdr(amount: bigint | number): string {
  return `Rp${Number(amount).toLocaleString("id-ID")}`;
}

/**
 * Marks `approved` contracts as `expired` when their 48-hour mutual signature deadline lapses.
 */
export async function expireApprovedUnsignedContracts(
  db: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const candidates = await db.contract.findMany({
    where: {
      status: "approved",
      signDeadlineAt: { not: null, lte: now },
    },
    select: {
      id: true,
      buyerId: true,
      offer: { select: { ownerId: true } },
    },
  });

  let expiredCount = 0;
  for (const candidate of candidates) {
    const claimed = await db.$transaction(async (tx) => {
      const updated = await tx.contract.updateMany({
        where: {
          id: candidate.id,
          status: "approved",
          signDeadlineAt: { lte: now },
        },
        data: {
          status: "expired",
          cancelReason: SIGN_EXPIRED_REASON,
        },
      });
      if (updated.count === 0) return false;

      await tx.notification.createMany({
        data: [
          {
            accountId: candidate.buyerId,
            type: "kontrak",
            title: "Kesepakatan Kedaluwarsa (Tenggat Tanda Tangan 48 Jam)",
            description: `${SIGN_EXPIRED_REASON} Volume gabah telah dikembalikan ke penawaran petani.`,
            linkHref: `/kontrak/${candidate.id}`,
            contractId: candidate.id,
          },
          {
            accountId: candidate.offer.ownerId,
            type: "kontrak",
            title: "Kesepakatan Kedaluwarsa (Tenggat Tanda Tangan 48 Jam)",
            description: `${SIGN_EXPIRED_REASON} Stok gabah pada tawaran Anda dipulihkan otomatis.`,
            linkHref: `/kontrak/${candidate.id}`,
            contractId: candidate.id,
          },
        ],
      });

      await tx.auditLog.create({
        data: {
          actorRole: "sistem",
          actorName: "Sistem Transaksi",
          action: "CONTRACT_EXPIRED_UNSIGNED",
          targetType: "contract",
          targetId: candidate.id,
          details: SIGN_EXPIRED_REASON,
        },
      });
      return true;
    });

    if (claimed) expiredCount += 1;
  }

  return expiredCount;
}

/**
 * Sends a 24-hour reminder before a paid contract reaches its 7-day farmer shipping deadline.
 */
export async function sendShippingOverdueReminders(
  db: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const threshold = new Date(now.getTime() + SHIPPING_REMINDER_LEAD_MS);
  const dueSoon = await db.contract.findMany({
    where: {
      status: "signed",
      shippedAt: null,
      shippingReminderSentAt: null,
      disputeStatus: "none",
      shippingDeadlineAt: { not: null, gt: now, lte: threshold },
      payments: { some: { status: "paid", escrowStatus: "held" } },
    },
    select: {
      id: true,
      buyerId: true,
      offer: { select: { ownerId: true } },
    },
  });

  let reminded = 0;
  for (const contract of dueSoon) {
    const sent = await db.$transaction(async (tx) => {
      const claim = await tx.contract.updateMany({
        where: {
          id: contract.id,
          status: "signed",
          shippingReminderSentAt: null,
          shippedAt: null,
        },
        data: { shippingReminderSentAt: now },
      });
      if (claim.count === 0) return false;

      await tx.notification.create({
        data: {
          accountId: contract.offer.ownerId,
          type: "kontrak",
          title: "Pengingat Tenggat Pengiriman (< 24 Jam)",
          description:
            "Batas waktu 7 hari pengiriman gabah setelah pelunasan escrow tinggal kurang dari 24 jam. Segera konfirmasi pengiriman agar kontrak tidak dibatalkan otomatis.",
          linkHref: `/kontrak/${contract.id}`,
          contractId: contract.id,
        },
      });
      return true;
    });
    if (sent) reminded += 1;
  }

  return reminded;
}

/**
 * Cancels paid contracts unshipped past 7 days and flags the held escrow for Admin refund resolution.
 */
export async function cancelUnshippedPaidContracts(
  db: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const overdue = await db.contract.findMany({
    where: {
      status: "signed",
      shippedAt: null,
      shippingDeadlineAt: { not: null, lte: now },
      payments: { some: { status: "paid", escrowStatus: "held" } },
    },
    select: {
      id: true,
      buyerId: true,
      offer: { select: { ownerId: true } },
    },
  });

  let cancelledCount = 0;
  for (const item of overdue) {
    const done = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${item.id}::uuid FOR UPDATE`;

      const row = await tx.contract.findUnique({
        where: { id: item.id },
        select: {
          id: true,
          status: true,
          shippedAt: true,
          shippingDeadlineAt: true,
          disputeStatus: true,
          buyerId: true,
          offer: { select: { ownerId: true } },
        },
      });
      if (
        !row ||
        row.status !== "signed" ||
        row.shippedAt !== null ||
        !row.shippingDeadlineAt ||
        row.shippingDeadlineAt.getTime() > now.getTime()
      ) {
        return false;
      }

      const paidPayment = await tx.payment.findFirst({
        where: { contractId: row.id, status: "paid", escrowStatus: "held" },
        select: { id: true, grossAmount: true, orderId: true },
      });
      if (!paidPayment) return false;

      await tx.contract.update({
        where: { id: row.id },
        data: {
          status: "cancelled",
          cancelReason: SHIPPING_OVERDUE_CANCEL_REASON,
          disputeStatus: row.disputeStatus === "none" ? "open" : row.disputeStatus,
          disputeByRole: row.disputeStatus === "none" ? "sistem" : undefined,
          disputeReason: row.disputeStatus === "none" ? SHIPPING_OVERDUE_DISPUTE_REASON : undefined,
          disputedAt: row.disputeStatus === "none" ? now : undefined,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            accountId: row.buyerId,
            type: "kontrak",
            title: "Kontrak Dibatalkan Otomatis — Pengembalian Dana Diproses",
            description: `${SHIPPING_OVERDUE_CANCEL_REASON} Dana escrow Anda (${formatIdr(paidPayment.grossAmount)}) telah ditandai untuk pengembalian oleh pengawas sistem.`,
            linkHref: `/kontrak/${row.id}`,
            contractId: row.id,
          },
          {
            accountId: row.offer.ownerId,
            type: "kontrak",
            title: "Kontrak Dibatalkan — Tenggat Pengiriman 7 Hari Lewat",
            description: `${SHIPPING_OVERDUE_CANCEL_REASON} Dana escrow produsen ditandai untuk pengembalian oleh pengawas.`,
            linkHref: `/kontrak/${row.id}`,
            contractId: row.id,
          },
        ],
      });

      await tx.auditLog.create({
        data: {
          actorRole: "sistem",
          actorName: "Sistem Transaksi",
          action: "CONTRACT_AUTO_CANCELLED_UNSHIPPED",
          targetType: "contract",
          targetId: row.id,
          details: `Kontrak ${row.id} dibatalkan otomatis karena melewati batas pengiriman 7 hari. Escrow ${paidPayment.orderId} menunggu proses refund pengawas.`,
        },
      });

      return true;
    });
    if (done) cancelledCount += 1;
  }

  return cancelledCount;
}

/**
 * Auto-completes undisputed shipped contracts 5 days after dispatch and releases held escrow to farmer.
 */
export async function autoCompleteAndReleaseShippedContracts(
  db: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const due = await db.contract.findMany({
    where: {
      status: "shipping",
      disputeStatus: "none",
      receiptDeadlineAt: { not: null, lte: now },
    },
    select: {
      id: true,
    },
  });

  let completedCount = 0;
  for (const item of due) {
    const released = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${item.id}::uuid FOR UPDATE`;

      const row = await tx.contract.findUnique({
        where: { id: item.id },
        select: {
          id: true,
          status: true,
          disputeStatus: true,
          receiptDeadlineAt: true,
          handoverNotes: true,
          buyerId: true,
          offer: { select: { ownerId: true } },
        },
      });
      if (
        !row ||
        row.status !== "shipping" ||
        row.disputeStatus !== "none" ||
        !row.receiptDeadlineAt ||
        row.receiptDeadlineAt.getTime() > now.getTime()
      ) {
        return false;
      }

      await tx.contract.update({
        where: { id: row.id },
        data: {
          status: "completed",
          completedAt: now,
          farmerConfirmed: true,
          buyerConfirmed: true,
          handoverNotes: row.handoverNotes || AUTO_COMPLETE_HANDOVER_NOTE,
        },
      });

      const heldPayment = await tx.payment.findFirst({
        where: { contractId: row.id, status: "paid", escrowStatus: "held" },
        select: { id: true, orderId: true, contractAmount: true },
      });
      if (heldPayment) {
        const updatedPayment = await tx.payment.updateMany({
          where: { id: heldPayment.id, status: "paid", escrowStatus: "held" },
          data: { escrowStatus: "released", releasedAt: now, lastSyncedAt: now },
        });
        if (updatedPayment.count > 0) {
          await tx.auditLog.create({
            data: {
              actorRole: "sistem",
              actorName: "Sistem Escrow",
              action: "ESCROW_RELEASED",
              targetType: "contract",
              targetId: row.id,
              details: `Pencairan otomatis dana bersih petani ${formatIdr(heldPayment.contractAmount)} (${heldPayment.orderId}) setelah 5 hari pengiriman tanpa sengketa.`,
            },
          });
        }
      }

      await tx.notification.createMany({
        data: [
          {
            accountId: row.offer.ownerId,
            type: "kontrak",
            title: "Transaksi Selesai & Dana Escrow Dicairkan Otomatis",
            description:
              "Batas konfirmasi 5 hari pengiriman telah berakhir tanpa keberatan produsen. Transaksi dinyatakan selesai dan dana escrow dicairkan.",
            linkHref: `/kontrak/${row.id}/bukti`,
            contractId: row.id,
          },
          {
            accountId: row.buyerId,
            type: "kontrak",
            title: "Transaksi Selesai Otomatis (Batas Konfirmasi 5 Hari)",
            description:
              "Kontrak diselesaikan otomatis karena 5 hari telah berlalu sejak pengiriman tanpa keberatan. Bukti kesepakatan final siap diunduh.",
            linkHref: `/kontrak/${row.id}/bukti`,
            contractId: row.id,
          },
        ],
      });

      await tx.auditLog.create({
        data: {
          actorRole: "sistem",
          actorName: "Sistem Transaksi",
          action: "CONTRACT_AUTO_COMPLETED_ESCROW_RELEASED",
          targetType: "contract",
          targetId: row.id,
          details: "Kontrak selesai otomatis setelah 5 hari sejak pengiriman tanpa laporan keberatan.",
        },
      });

      return true;
    });
    if (released) completedCount += 1;
  }

  return completedCount;
}
