import { Prisma, type PrismaClient } from "@prisma/client";
import { ApiError } from "../../shared/api-error.ts";
import { isBuyerPro } from "../auth/session.ts";
import { SHIPPING_DEADLINE_MS } from "../contracts/contracts.constants.ts";
import { present as presentOffer, include as offerInclude } from "../offers/offers.service.ts";
import {
  cancelTransaction,
  createSnapTransaction,
  extractPaymentMetadata,
  fetchTransactionStatus,
  formatMidtransStartTime,
  isMidtransConfigured,
  mapMidtransStatus,
  readMidtransConfig,
  verifyWebhookSignature,
  type SnapItemDetail,
} from "./midtrans.client.ts";
import { midtransWebhookSchema } from "./payments.schemas.ts";
import {
  handleSubscriptionMidtransWebhook,
  PRO_BUYER_FEE_RATE,
} from "../subscriptions/subscriptions.service.ts";

export const BUYER_FEE_RATE = 0.005;
export { PRO_BUYER_FEE_RATE };
export const PAYMENT_DUE_MS = 7 * 86_400_000;
export const PAYMENT_GRACE_MS = 3 * 86_400_000;
export const AUTO_CANCEL_REASON = "Produsen tidak membayar dalam tenggat waktu.";

const MIN_SNAP_EXPIRY_MINUTES = 15;
const MAX_SNAP_EXPIRY_MINUTES = 10 * 24 * 60;

export interface PaymentActor {
  id: string;
  role: string;
}

export interface PresentedPayment {
  id: string;
  contractId: string;
  attempt: number;
  orderId: string;
  contractAmount: number;
  buyerFeeAmount: number;
  grossAmount: number;
  currency: string;
  provider: string;
  status: string;
  escrowStatus: string;
  paymentType: string | null;
  paymentChannel: string | null;
  paymentReference: string | null;
  midtransTransactionId: string | null;
  midtransStatus: string | null;
  fraudStatus: string | null;
  redirectUrl: string | null;
  paidAt: string | null;
  releasedAt: string | null;
  expiresAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentRecord = Prisma.PaymentGetPayload<Record<string, never>>;

/**
 * Serializes a database Payment row cleanly for API responses without internal secrets or raw webhook blobs.
 */
export function presentPayment(row: PaymentRecord): PresentedPayment {
  return {
    id: row.id,
    contractId: row.contractId,
    attempt: row.attempt,
    orderId: row.orderId,
    contractAmount: Number(row.contractAmount),
    buyerFeeAmount: Number(row.buyerFeeAmount),
    grossAmount: Number(row.grossAmount),
    currency: row.currency,
    provider: row.provider,
    status: row.status,
    escrowStatus: row.escrowStatus,
    paymentType: row.paymentType,
    paymentChannel: row.paymentChannel,
    paymentReference: row.paymentReference,
    midtransTransactionId: row.midtransTransactionId,
    midtransStatus: row.midtransStatus,
    fraudStatus: row.fraudStatus,
    redirectUrl: row.redirectUrl,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    releasedAt: row.releasedAt ? row.releasedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Computes farmer net payout (contractAmount), buyer service fee (0.5% standard or 0.25% Produsen Pro), and total Midtrans gross amount in integer IDR.
 */
export function computePaymentAmounts(
  volumeKg: Prisma.Decimal | number | string,
  currentPrice: number,
  feeRate: number = BUYER_FEE_RATE
): { contractAmount: bigint; buyerFeeAmount: bigint; grossAmount: bigint } {
  const contractNum = Math.round(Number(volumeKg) * currentPrice);
  const feeNum = Math.round(contractNum * feeRate);
  const contractAmount = BigInt(contractNum);
  const buyerFeeAmount = BigInt(feeNum);
  return {
    contractAmount,
    buyerFeeAmount,
    grossAmount: contractAmount + buyerFeeAmount,
  };
}

/**
 * Builds a deterministic, collision-free Midtrans order_id under 50 characters per payment attempt.
 */
export function buildOrderId(contractId: string, attempt: number): string {
  const shortHex = contractId.replace(/-/g, "").slice(0, 16).toUpperCase();
  return `SMBG-${shortHex}-${attempt}`;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function formatIdr(amount: bigint | number): string {
  return `Rp${Number(amount).toLocaleString("id-ID")}`;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function computeSnapExpiry(
  now: Date,
  paymentGraceEndsAt: Date | null
): { durationMinutes: number; expiresAt: Date } {
  const fallbackEnd = now.getTime() + PAYMENT_DUE_MS + PAYMENT_GRACE_MS;
  const targetEndMs = paymentGraceEndsAt ? paymentGraceEndsAt.getTime() : fallbackEnd;
  const remainingMinutes = Math.floor((targetEndMs - now.getTime()) / 60_000);
  const durationMinutes = Math.min(
    MAX_SNAP_EXPIRY_MINUTES,
    Math.max(MIN_SNAP_EXPIRY_MINUTES, remainingMinutes)
  );
  const clampedExpiresMs = Math.min(
    now.getTime() + durationMinutes * 60_000,
    paymentGraceEndsAt ? targetEndMs : Number.POSITIVE_INFINITY
  );
  return {
    durationMinutes,
    expiresAt: new Date(Math.max(now.getTime() + 60_000, clampedExpiresMs)),
  };
}

/**
 * Atomically applies a verified Midtrans transaction status with strict monotonic rules (never downgrades 'paid').
 */
export async function applyMidtransStatusTransition(
  db: PrismaClient,
  orderId: string,
  payload: Record<string, unknown>,
  source: "webhook" | "sync" | "initiate_check" | "sweeper_rescue"
): Promise<{ payment: PresentedPayment; transitionedToPaid: boolean }> {
  const txStatus = String(payload.transaction_status ?? "pending");
  const fraudStatus = typeof payload.fraud_status === "string" ? payload.fraud_status : null;
  const mapped = mapMidtransStatus(txStatus, fraudStatus);
  const meta = extractPaymentMetadata(payload);
  const now = new Date();
  const rawJson = toJsonInput(payload);

  const lookup = await db.payment.findUnique({
    where: { orderId },
    select: { id: true, contractId: true },
  });
  if (!lookup) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Data pembayaran tidak ditemukan.");
  }

  const updatedRow = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${lookup.contractId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "contract_payment" WHERE "order_id" = ${orderId} FOR UPDATE`;

    const current = await tx.payment.findUnique({
      where: { orderId },
      include: {
        contract: {
          select: {
            id: true,
            buyerId: true,
            status: true,
            offer: {
              select: {
                ownerId: true,
                grainType: true,
              },
            },
          },
        },
      },
    });
    if (!current) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Data pembayaran tidak ditemukan.");
    }

    if (payload.gross_amount !== undefined) {
      const incomingAmount = Math.round(Number(payload.gross_amount));
      if (!Number.isFinite(incomingAmount) || incomingAmount !== Number(current.grossAmount)) {
        throw new ApiError(
          422,
          "AMOUNT_MISMATCH",
          "Nominal pembayaran Midtrans tidak sesuai dengan tagihan kontrak."
        );
      }
    }

    // Already paid: strictly forbid downgrades; only allow refund when still held in escrow.
    if (current.status === "paid") {
      if (mapped.status === "refunded") {
        if (current.escrowStatus === "held") {
          const refunded = await tx.payment.update({
            where: { id: current.id },
            data: {
              status: "refunded",
              escrowStatus: "refunded",
              midtransTransactionId: meta.midtransTransactionId ?? current.midtransTransactionId,
              midtransStatus: meta.midtransStatus ?? current.midtransStatus,
              fraudStatus: meta.fraudStatus ?? current.fraudStatus,
              rawNotification: rawJson,
              lastSyncedAt: now,
            },
          });
          await tx.notification.createMany({
            data: [
              {
                accountId: current.contract.buyerId,
                type: "kontrak",
                title: "Pengembalian Dana Pembayaran",
                description: `Dana escrow untuk kontrak ini (${formatIdr(current.grossAmount)}) berstatus dikembalikan (${source}).`,
                linkHref: `/kontrak/${current.contract.id}`,
                contractId: current.contract.id,
              },
              {
                accountId: current.contract.offer.ownerId,
                type: "kontrak",
                title: "Status Pembayaran Dikembalikan",
                description: `Status pembayaran kontrak diubah menjadi dikembalikan oleh gerbang pembayaran (${current.orderId}).`,
                linkHref: `/kontrak/${current.contract.id}`,
                contractId: current.contract.id,
              },
            ],
          });
          await tx.auditLog.create({
            data: {
              actorRole: "sistem",
              actorName: "Midtrans Sandbox",
              action: "PAYMENT_REFUNDED",
              targetType: "contract",
              targetId: current.contract.id,
              details: `Pembayaran ${current.orderId} berubah menjadi refunded dari status held (${source}).`,
            },
          });
          return { row: refunded, transitionedToPaid: false };
        }

        const untouchedReleased = await tx.payment.update({
          where: { id: current.id },
          data: {
            rawNotification: rawJson,
            lastSyncedAt: now,
          },
        });
        await tx.auditLog.create({
          data: {
            actorRole: "sistem",
            actorName: "Midtrans Sandbox",
            action: "REFUND_AFTER_RELEASE_ALERT",
            targetType: "contract",
            targetId: current.contract.id,
            details: `Menerima notifikasi refund untuk ${current.orderId} padahal dana escrow sudah released ke petani.`,
          },
        });
        return { row: untouchedReleased, transitionedToPaid: false };
      }

      const untouched = await tx.payment.update({
        where: { id: current.id },
        data: { lastSyncedAt: now },
      });
      return { row: untouched, transitionedToPaid: false };
    }

    if (current.status === "refunded") {
      const untouched = await tx.payment.update({
        where: { id: current.id },
        data: { lastSyncedAt: now },
      });
      return { row: untouched, transitionedToPaid: false };
    }

    // Never reopen a non-pending attempt back into 'pending' (prevents partial unique index collisions).
    if (current.status !== "pending" && mapped.status !== "paid") {
      const syncedOnly = await tx.payment.update({
        where: { id: current.id },
        data: { lastSyncedAt: now },
      });
      return { row: syncedOnly, transitionedToPaid: false };
    }

    if (mapped.status === "paid") {
      const existingPaid = await tx.payment.findFirst({
        where: {
          contractId: current.contractId,
          status: "paid",
          id: { not: current.id },
        },
        select: { id: true, orderId: true },
      });
      if (existingPaid) {
        const updated = await tx.payment.update({
          where: { id: current.id },
          data: {
            rawNotification: rawJson,
            lastSyncedAt: now,
          },
        });
        await tx.auditLog.create({
          data: {
            actorRole: "sistem",
            actorName: "Midtrans Sandbox",
            action: "DOUBLE_PAYMENT_ALERT",
            targetType: "contract",
            targetId: current.contract.id,
            details: `Menerima pelunasan ganda untuk ${current.orderId} padahal kontrak sudah lunas melalui ${existingPaid.orderId} (${source}).`,
          },
        });
        return { row: updated, transitionedToPaid: false };
      }

      if (current.contract.status === "cancelled" || current.contract.status === "expired") {
        await tx.contract.updateMany({
          where: { id: current.contract.id, disputeStatus: "none" },
          data: {
            disputeStatus: "open",
            disputeByRole: "sistem",
            disputeReason:
              "Pembayaran masuk terlambat setelah kontrak berstatus batal/kedaluwarsa. Memerlukan pengembalian dana oleh pengawas.",
            disputedAt: now,
          },
        });
        await tx.auditLog.create({
          data: {
            actorRole: "sistem",
            actorName: "Midtrans Sandbox",
            action: "PAYMENT_ON_CANCELLED_CONTRACT_ALERT",
            targetType: "contract",
            targetId: current.contract.id,
            details: `Pembayaran ${current.orderId} terkonfirmasi lunas saat kontrak sudah berstatus ${current.contract.status}. Ditandai untuk pengembalian dana pengawas.`,
          },
        });
      } else if (current.contract.status === "signed") {
        await tx.contract.update({
          where: { id: current.contract.id },
          data: {
            shippingDeadlineAt: new Date(now.getTime() + SHIPPING_DEADLINE_MS),
          },
        });
      }

      const paidRow = await tx.payment.update({
        where: { id: current.id },
        data: {
          status: "paid",
          escrowStatus: "held",
          paidAt: now,
          releasedAt: null,
          paymentType: meta.paymentType ?? current.paymentType,
          paymentChannel: meta.paymentChannel ?? current.paymentChannel,
          paymentReference: meta.paymentReference ?? current.paymentReference,
          midtransTransactionId: meta.midtransTransactionId ?? current.midtransTransactionId,
          midtransStatus: meta.midtransStatus ?? current.midtransStatus,
          fraudStatus: meta.fraudStatus ?? current.fraudStatus,
          rawNotification: rawJson,
          lastSyncedAt: now,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            accountId: current.contract.offer.ownerId,
            type: "kontrak",
            title: "Pembayaran Escrow Masuk — Siap Kirim Gabah",
            description: `Produsen telah melunasi tagihan escrow. Dana bersih ${formatIdr(current.contractAmount)} ditahan aman dan Anda sudah dapat mengonfirmasi pengiriman gabah.`,
            linkHref: `/kontrak/${current.contract.id}`,
            contractId: current.contract.id,
          },
          {
            accountId: current.contract.buyerId,
            type: "kontrak",
            title: "Pembayaran Terkonfirmasi (Escrow Ditahan)",
            description: `Pembayaran sebesar ${formatIdr(current.grossAmount)} (${current.orderId}) berhasil diverifikasi. Dana akan dicairkan ke petani setelah Anda mengonfirmasi barang tiba.`,
            linkHref: `/kontrak/${current.contract.id}`,
            contractId: current.contract.id,
          },
        ],
      });

      await tx.auditLog.create({
        data: {
          actorRole: "sistem",
          actorName: "Midtrans Sandbox",
          action: "PAYMENT_SETTLED",
          targetType: "contract",
          targetId: current.contract.id,
          details: `Pelunasan ${current.orderId} (${formatIdr(current.grossAmount)}; hak petani ${formatIdr(current.contractAmount)}) via ${source}.`,
        },
      });

      return { row: paidRow, transitionedToPaid: true };
    }

    // Cannot mark 'refunded' directly from an unpaid status due to SQL paid_at invariant.
    const nextStatus = mapped.status === "refunded" ? current.status : mapped.status;
    const updated = await tx.payment.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
        escrowStatus: "unpaid",
        paidAt: null,
        releasedAt: null,
        paymentType: meta.paymentType ?? current.paymentType,
        paymentChannel: meta.paymentChannel ?? current.paymentChannel,
        paymentReference: meta.paymentReference ?? current.paymentReference,
        midtransTransactionId: meta.midtransTransactionId ?? current.midtransTransactionId,
        midtransStatus: meta.midtransStatus ?? current.midtransStatus,
        fraudStatus: meta.fraudStatus ?? current.fraudStatus,
        rawNotification: rawJson,
        lastSyncedAt: now,
      },
    });

    return { row: updated, transitionedToPaid: false };
  });

  return {
    payment: presentPayment(updatedRow.row),
    transitionedToPaid: updatedRow.transitionedToPaid,
  };
}

/**
 * Initiates or reuses a Midtrans Sandbox Snap session for a signed contract owned by the requesting buyer.
 */
export async function initiateContractPayment(
  db: PrismaClient,
  actor: PaymentActor,
  contractId: string,
  options: { recreate?: boolean } = {}
) {
  const config = readMidtransConfig();
  const recreate = options.recreate === true;

  const contractInclude = {
    offer: { select: { ownerId: true, grainType: true } },
    buyer: { select: { id: true, name: true, phone: true, email: true, proExpiresAt: true } },
    payments: { orderBy: { attempt: "desc" as const } },
  };

  async function reserveOrReuseInTx() {
    try {
      return await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${contractId}::uuid FOR UPDATE`;

        const contract = await tx.contract.findUnique({
          where: { id: contractId },
          include: contractInclude,
        });
        if (!contract) {
          throw new ApiError(404, "NOT_FOUND", "Kontrak tidak ditemukan.");
        }

        const isParty = actor.id === contract.buyerId || actor.id === contract.offer.ownerId;
        if (!isParty) {
          throw new ApiError(404, "NOT_FOUND", "Kontrak tidak ditemukan.");
        }
        if (actor.role !== "pembeli" || actor.id !== contract.buyerId) {
          throw new ApiError(
            403,
            "FORBIDDEN",
            "Hanya pihak produsen pada kontrak ini yang dapat melakukan pembayaran."
          );
        }
        if (contract.status !== "signed") {
          throw new ApiError(
            409,
            "INVALID_STATUS",
            "Pembayaran hanya dapat dilakukan setelah kedua belah pihak menandatangani kontrak."
          );
        }

        const now = new Date();
        if (contract.paymentGraceEndsAt && now.getTime() >= contract.paymentGraceEndsAt.getTime()) {
          throw new ApiError(
            409,
            "PAYMENT_DEADLINE_PASSED",
            "Tenggat pembayaran beserta masa tenggang kontrak telah berakhir."
          );
        }

        const paid = contract.payments.find((p) => p.status === "paid");
        if (paid) {
          throw new ApiError(
            409,
            "ALREADY_PAID",
            "Pembayaran untuk kontrak ini telah lunas dan ditahan di escrow."
          );
        }

        const pending = contract.payments.find((p) => p.status === "pending");
        if (pending) {
          if (!pending.snapToken) {
            const ageMs = now.getTime() - pending.createdAt.getTime();
            if (ageMs < config.timeoutMs + 5000) {
              throw new ApiError(
                409,
                "PAYMENT_IN_PROGRESS",
                "Permintaan sesi pembayaran sedang diproses. Silakan tunggu sebentar lalu muat ulang."
              );
            }
            await tx.payment.update({
              where: { id: pending.id },
              data: { status: "failed", escrowStatus: "unpaid", lastSyncedAt: now },
            });
          } else {
            const isExpired = Boolean(
              pending.expiresAt && now.getTime() >= pending.expiresAt.getTime()
            );
            if (!isExpired && !recreate) {
              return { kind: "reuse" as const, payment: pending };
            }
            return {
              kind: "close_existing" as const,
              pending,
              isExpired,
            };
          }
        }

        const latestAttempt = contract.payments.reduce(
          (max, item) => (item.attempt > max ? item.attempt : max),
          0
        );
        const attempt = latestAttempt + 1;
        const orderId = buildOrderId(contract.id, attempt);
        const buyerIsPro = isBuyerPro(
          { role: "pembeli", proExpiresAt: contract.buyer.proExpiresAt },
          now
        );
        const feeRate = buyerIsPro ? PRO_BUYER_FEE_RATE : BUYER_FEE_RATE;
        const { contractAmount, buyerFeeAmount, grossAmount } = computePaymentAmounts(
          contract.volumeKg,
          contract.currentPrice,
          feeRate
        );
        const expiryInfo = computeSnapExpiry(now, contract.paymentGraceEndsAt);

        const reserved = await tx.payment.create({
          data: {
            contractId: contract.id,
            attempt,
            orderId,
            contractAmount,
            buyerFeeAmount,
            grossAmount,
            currency: "IDR",
            provider: "midtrans_sandbox",
            status: "pending",
            escrowStatus: "unpaid",
            expiresAt: expiryInfo.expiresAt,
          },
        });

        return {
          kind: "created" as const,
          reserved,
          contract,
          durationMinutes: expiryInfo.durationMinutes,
          now,
          isProRate: buyerIsPro,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiError(
          409,
          "PAYMENT_IN_PROGRESS",
          "Sesi pembayaran sedang diproses oleh permintaan lain. Silakan coba beberapa saat lagi."
        );
      }
      throw error;
    }
  }

  let step = await reserveOrReuseInTx();

  if (step.kind === "reuse") {
    return {
      payment: presentPayment(step.payment),
      snapToken: step.payment.snapToken!,
      redirectUrl: step.payment.redirectUrl!,
      clientKey: config.clientKey,
      snapScriptUrl: config.snapScriptUrl,
    };
  }

  if (step.kind === "close_existing") {
    const existing = step.pending;
    let nextStatus: "cancelled" | "expired" | "failed" = recreate ? "cancelled" : "expired";
    const remote = await fetchTransactionStatus(config, existing.orderId);
    if (remote.found) {
      const mapped = mapMidtransStatus(
        String(remote.data.transaction_status ?? "pending"),
        typeof remote.data.fraud_status === "string" ? remote.data.fraud_status : null
      );
      if (mapped.status === "paid") {
        await applyMidtransStatusTransition(db, existing.orderId, remote.data, "initiate_check");
        throw new ApiError(
          409,
          "ALREADY_PAID",
          "Pembayaran Anda baru saja terkonfirmasi lunas di Midtrans Sandbox."
        );
      }
      if (mapped.status === "pending" && (recreate || step.isExpired)) {
        await cancelTransaction(config, existing.orderId);
      }
      if (
        mapped.status === "expired" ||
        mapped.status === "failed" ||
        mapped.status === "cancelled"
      ) {
        nextStatus = mapped.status;
      }
    }

    await db.payment.updateMany({
      where: { id: existing.id, status: "pending" },
      data: {
        status: nextStatus,
        escrowStatus: "unpaid",
        lastSyncedAt: new Date(),
      },
    });

    step = await reserveOrReuseInTx();
    if (step.kind === "reuse") {
      return {
        payment: presentPayment(step.payment),
        snapToken: step.payment.snapToken!,
        redirectUrl: step.payment.redirectUrl!,
        clientKey: config.clientKey,
        snapScriptUrl: config.snapScriptUrl,
      };
    }
    if (step.kind !== "created") {
      throw new ApiError(
        409,
        "PAYMENT_IN_PROGRESS",
        "Permintaan sesi pembayaran berubah serentak. Silakan coba kembali."
      );
    }
  }

  const { reserved, contract, durationMinutes, now, isProRate } = step;

  const items: SnapItemDetail[] = [
    {
      id: `GRAIN-${contract.id.slice(0, 8)}`,
      price: Number(reserved.contractAmount),
      quantity: 1,
      name: `Gabah ${contract.offer.grainType} ${Number(contract.volumeKg)} kg`.slice(0, 50),
    },
  ];
  if (reserved.buyerFeeAmount > 0n) {
    items.push({
      id: isProRate ? "PLATFORM-FEE-025PCT" : "PLATFORM-FEE-05PCT",
      price: Number(reserved.buyerFeeAmount),
      quantity: 1,
      name: isProRate
        ? "Biaya Layanan Pembayaran (0,25% Pro)"
        : "Biaya Layanan Pembayaran (0,5%)",
    });
  }

  try {
    const snap = await createSnapTransaction(config, {
      orderId: reserved.orderId,
      grossAmount: Number(reserved.grossAmount),
      items,
      customer: {
        firstName: contract.buyer.name,
        phone: contract.buyer.phone,
        email: contract.buyer.email,
      },
      expiry: {
        startTime: formatMidtransStartTime(now),
        unit: "minutes",
        duration: durationMinutes,
      },
    });

    const saved = await db.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: reserved.id },
        data: {
          snapToken: snap.token,
          redirectUrl: snap.redirectUrl,
          lastSyncedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorRole: actor.role,
          actorName: contract.buyer.name,
          action: "PAYMENT_INITIATED",
          targetType: "contract",
          targetId: contract.id,
          details: `Membuat sesi pembayaran Midtrans Sandbox ${reserved.orderId} (${formatIdr(reserved.grossAmount)}; hak petani ${formatIdr(reserved.contractAmount)}).`,
        },
      });
      return updated;
    });

    return {
      payment: presentPayment(saved),
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      clientKey: config.clientKey,
      snapScriptUrl: config.snapScriptUrl,
    };
  } catch (err) {
    await db.payment.updateMany({
      where: { id: reserved.id, status: "pending" },
      data: {
        status: "failed",
        escrowStatus: "unpaid",
        lastSyncedAt: new Date(),
      },
    });
    throw err;
  }
}

/**
 * Queries Midtrans Sandbox Status API for the latest payment of a contract (used on localhost & manual sync).
 */
export async function syncContractPayment(
  db: PrismaClient,
  actor: PaymentActor,
  contractId: string
) {
  const config = readMidtransConfig();

  const contract = await db.contract.findUnique({
    where: { id: contractId },
    include: {
      offer: { select: { ownerId: true } },
      payments: { orderBy: { attempt: "desc" }, take: 1 },
    },
  });
  if (!contract) {
    throw new ApiError(404, "NOT_FOUND", "Kontrak tidak ditemukan.");
  }

  const isParty =
    actor.role === "admin" ||
    actor.id === contract.buyerId ||
    actor.id === contract.offer.ownerId;
  if (!isParty) {
    throw new ApiError(404, "NOT_FOUND", "Kontrak tidak ditemukan.");
  }

  const latest = contract.payments[0];
  if (!latest) {
    throw new ApiError(
      404,
      "PAYMENT_NOT_FOUND",
      "Belum ada sesi pembayaran yang dibuat untuk kontrak ini."
    );
  }

  if (latest.status === "paid" || latest.status === "refunded") {
    return {
      payment: presentPayment(latest),
      synced: false,
      awaitingMethodSelection: false,
    };
  }

  const remote = await fetchTransactionStatus(config, latest.orderId);
  if (!remote.found) {
    const now = new Date();
    const isExpired = Boolean(latest.expiresAt && now.getTime() >= latest.expiresAt.getTime());
    const refreshed = await db.payment.update({
      where: { id: latest.id },
      data: {
        ...(isExpired && latest.status === "pending" ? { status: "expired", escrowStatus: "unpaid" } : {}),
        lastSyncedAt: now,
      },
    });
    return {
      payment: presentPayment(refreshed),
      synced: true,
      awaitingMethodSelection: !isExpired && refreshed.status === "pending",
    };
  }

  if (remote.data.gross_amount !== undefined) {
    const remoteAmount = Math.round(Number(remote.data.gross_amount));
    if (!Number.isFinite(remoteAmount) || remoteAmount !== Number(latest.grossAmount)) {
      throw new ApiError(
        422,
        "AMOUNT_MISMATCH",
        "Nominal status pembayaran Midtrans tidak cocok dengan catatan tagihan kontrak."
      );
    }
  }

  const result = await applyMidtransStatusTransition(db, latest.orderId, remote.data, "sync");
  return {
    payment: result.payment,
    synced: true,
    awaitingMethodSelection: false,
  };
}

/**
 * Verifies SHA-512 signature and gross_amount from Midtrans webhook notifications, then updates payment state monotonically.
 */
export async function handleMidtransWebhook(db: PrismaClient, rawBody: unknown) {
  const parsed = midtransWebhookSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_WEBHOOK_PAYLOAD", "Format notifikasi webhook Midtrans tidak valid.");
  }

  const payload = parsed.data;
  const isSignatureValid = verifyWebhookSignature({
    order_id: payload.order_id,
    status_code: payload.status_code,
    gross_amount: payload.gross_amount,
    signature_key: payload.signature_key,
  });
  if (!isSignatureValid) {
    throw new ApiError(403, "INVALID_SIGNATURE", "Tanda tangan webhook Midtrans tidak valid.");
  }

  if (payload.order_id.startsWith("SUBS-")) {
    return handleSubscriptionMidtransWebhook(db, payload);
  }

  const existing = await db.payment.findUnique({
    where: { orderId: payload.order_id },
  });
  if (!existing) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order ID pembayaran tidak ditemukan pada sistem.");
  }

  const incomingAmount = Math.round(Number(payload.gross_amount));
  if (!Number.isFinite(incomingAmount) || incomingAmount !== Number(existing.grossAmount)) {
    throw new ApiError(422, "AMOUNT_MISMATCH", "Nominal pembayaran pada webhook tidak sesuai dengan tagihan.");
  }

  const result = await applyMidtransStatusTransition(db, payload.order_id, payload, "webhook");
  return {
    received: true,
    orderId: result.payment.orderId,
    status: result.payment.status,
    escrowStatus: result.payment.escrowStatus,
  };
}

/**
 * Sends a one-time 3-day grace-period reminder notification when a signed contract passes its 7-day paymentDueAt.
 */
export async function sendPaymentOverdueReminders(
  db: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const dueContracts = await db.contract.findMany({
    where: {
      status: "signed",
      paymentDueAt: { lte: now },
      paymentReminderSentAt: null,
      payments: { none: { status: "paid" } },
    },
    select: {
      id: true,
      buyerId: true,
      paymentGraceEndsAt: true,
      offer: { select: { ownerId: true } },
    },
  });

  let sentCount = 0;
  for (const contract of dueContracts) {
    try {
      const claimed = await db.$transaction(async (tx) => {
        const updated = await tx.contract.updateMany({
          where: {
            id: contract.id,
            status: "signed",
            paymentDueAt: { lte: now },
            paymentReminderSentAt: null,
            payments: { none: { status: "paid" } },
          },
          data: { paymentReminderSentAt: now },
        });
        if (updated.count === 0) return false;

        await tx.notification.createMany({
          data: [
            {
              accountId: contract.buyerId,
              type: "kontrak",
              title: "Tenggat Pembayaran Lewat — Sisa Masa Tenggang 3 Hari",
              description:
                "Batas waktu pembayaran 7 hari untuk kontrak ini telah lewat. Harap segera melunasi dalam 3 hari atau kontrak akan dibatalkan otomatis oleh sistem.",
              linkHref: `/kontrak/${contract.id}`,
              contractId: contract.id,
            },
            {
              accountId: contract.offer.ownerId,
              type: "kontrak",
              title: "Pembayaran Produsen Memasuki Masa Tenggang 3 Hari",
              description:
                "Produsen belum menyelesaikan pembayaran dalam 7 hari. Sistem memberi masa tenggang 3 hari sebelum kontrak dibatalkan otomatis.",
              linkHref: `/kontrak/${contract.id}`,
              contractId: contract.id,
            },
          ],
        });

        await tx.auditLog.create({
          data: {
            actorRole: "sistem",
            actorName: "Sistem Transaksi",
            action: "PAYMENT_OVERDUE_WARNING",
            targetType: "contract",
            targetId: contract.id,
            details: "Mengirim pengingat masa tenggang pembayaran 3 hari setelah tenggat 7 hari terlewati.",
          },
        });
        return true;
      });

      if (claimed) sentCount += 1;
    } catch (err) {
      console.error("[sweeper] Gagal mengirim pengingat masa tenggang pembayaran:", contract.id, err);
    }
  }

  return sentCount;
}

/**
 * Auto-cancels signed contracts still unpaid after the +3 day grace period, rescuing any last-second settlement first.
 */
export async function cancelUnpaidSignedContracts(
  db: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const overdueContracts = await db.contract.findMany({
    where: {
      status: "signed",
      paymentGraceEndsAt: { lte: now },
      payments: { none: { status: "paid" } },
    },
    select: {
      id: true,
      buyerId: true,
      offer: { select: { ownerId: true } },
      payments: {
        where: { status: "pending" },
        orderBy: { attempt: "desc" },
        take: 1,
      },
    },
  });

  let cancelledCount = 0;
  for (const contract of overdueContracts) {
    try {
      const activePending = contract.payments[0];
      if (activePending?.snapToken && isMidtransConfigured()) {
        try {
          const config = readMidtransConfig();
          const remote = await fetchTransactionStatus(config, activePending.orderId);
          if (remote.found) {
            const mapped = mapMidtransStatus(
              String(remote.data.transaction_status ?? "pending"),
              typeof remote.data.fraud_status === "string" ? remote.data.fraud_status : null
            );
            if (mapped.status === "paid") {
              await applyMidtransStatusTransition(
                db,
                activePending.orderId,
                remote.data,
                "sweeper_rescue"
              );
              continue;
            }
          }
        } catch {
          // Avoid false auto-cancellation if Midtrans status lookup fails transiently; retry next sweep cycle.
          continue;
        }
      }

      const cancelled = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${contract.id}::uuid FOR UPDATE`;

        const row = await tx.contract.findUnique({
          where: { id: contract.id },
          select: {
            id: true,
            status: true,
            paymentGraceEndsAt: true,
            buyerId: true,
            offer: { select: { ownerId: true } },
          },
        });
        if (
          !row ||
          row.status !== "signed" ||
          !row.paymentGraceEndsAt ||
          row.paymentGraceEndsAt.getTime() > now.getTime()
        ) {
          return false;
        }

        const existingPaid = await tx.payment.findFirst({
          where: { contractId: row.id, status: "paid" },
          select: { id: true },
        });
        if (existingPaid) {
          return false;
        }

        await tx.payment.updateMany({
          where: { contractId: row.id, status: "pending" },
          data: {
            status: "expired",
            escrowStatus: "unpaid",
            lastSyncedAt: now,
          },
        });

        const changed = await tx.contract.updateMany({
          where: { id: row.id, status: "signed" },
          data: {
            status: "cancelled",
            cancelReason: AUTO_CANCEL_REASON,
          },
        });
        if (changed.count === 0) return false;

        await tx.notification.createMany({
          data: [
            {
              accountId: row.buyerId,
              type: "kontrak",
              title: "Kontrak Dibatalkan Otomatis",
              description: `${AUTO_CANCEL_REASON} Kesepakatan ini telah ditutup oleh sistem.`,
              linkHref: `/kontrak/${row.id}`,
              contractId: row.id,
            },
            {
              accountId: row.offer.ownerId,
              type: "kontrak",
              title: "Kontrak Dibatalkan — Stok Gabah Dipulihkan",
              description: `${AUTO_CANCEL_REASON} Volume gabah pada tawaran Anda kini tersedia kembali di pasar.`,
              linkHref: `/kontrak/${row.id}`,
              contractId: row.id,
            },
          ],
        });

        await tx.auditLog.create({
          data: {
            actorRole: "sistem",
            actorName: "Sistem Transaksi",
            action: "CONTRACT_AUTO_CANCELLED_UNPAID",
            targetType: "contract",
            targetId: row.id,
            details: `Kontrak dibatalkan otomatis setelah masa tenggang 7+3 hari: ${AUTO_CANCEL_REASON}`,
          },
        });

        return true;
      });

      if (cancelled) cancelledCount += 1;
    } catch (err) {
      console.error("[sweeper] Gagal membatalkan otomatis kontrak belum dibayar:", contract.id, err);
    }
  }

  return cancelledCount;
}

/**
 * Resolves an open escrow dispute or late-paid cancelled contract via Admin governance (release or refund).
 */
export async function resolveContractDisputeEscrow(
  db: PrismaClient,
  adminName: string,
  contractId: string,
  decision: "release_to_farmer" | "refund_to_buyer",
  note: string
) {
  const cleanNote = note.trim();
  const now = new Date();

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${contractId}::uuid FOR UPDATE`;

    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: {
        offer: { include: offerInclude },
        payments: { where: { status: "paid" }, orderBy: { attempt: "desc" } },
      },
    });
    if (!contract) {
      throw new ApiError(404, "NOT_FOUND", "Kontrak tidak ditemukan.");
    }

    const heldPayment = contract.payments.find((p) => p.escrowStatus === "held");
    if (!heldPayment) {
      throw new ApiError(
        409,
        "NO_HELD_ESCROW",
        "Kontrak ini tidak memiliki dana escrow aktif yang sedang ditahan."
      );
    }

    const canResolve =
      contract.disputeStatus === "open" ||
      contract.status === "cancelled" ||
      contract.status === "expired" ||
      contract.status === "signed" ||
      contract.status === "shipping";
    if (!canResolve) {
      throw new ApiError(409, "INVALID_STATUS", "Status kontrak tidak dapat diselesaikan oleh pengawas.");
    }

    if (decision === "release_to_farmer") {
      if (contract.status === "cancelled" || contract.status === "expired") {
        const offerSummary = presentOffer(contract.offer);
        if (offerSummary.availableVolumeKg < Number(contract.volumeKg)) {
          throw new ApiError(
            409,
            "INSUFFICIENT_STOCK",
            "Stok tawaran sudah dialokasikan ke pesanan lain karena kontrak sempat dibatalkan. Gunakan pengembalian dana ke produsen."
          );
        }
      }

      const released = await tx.payment.updateMany({
        where: { id: heldPayment.id, status: "paid", escrowStatus: "held" },
        data: { escrowStatus: "released", releasedAt: now, lastSyncedAt: now },
      });
      if (released.count === 0) {
        throw new ApiError(409, "ESCROW_ALREADY_SETTLED", "Status dana escrow telah berubah.");
      }

      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "completed",
          completedAt: contract.completedAt ?? now,
          farmerConfirmed: true,
          buyerConfirmed: true,
          disputeStatus: "resolved_released",
          disputeResolutionNote: cleanNote,
          disputeResolvedAt: now,
          disputeResolvedBy: adminName,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            accountId: contract.offer.ownerId,
            type: "kontrak",
            title: "Sengketa Selesai — Dana Escrow Dicairkan",
            description: `Pengawas sistem memutuskan pencairan dana bersih ${formatIdr(heldPayment.contractAmount)} kepada petani. Catatan: ${cleanNote}`,
            linkHref: `/kontrak/${contract.id}/bukti`,
            contractId: contract.id,
          },
          {
            accountId: contract.buyerId,
            type: "kontrak",
            title: "Sengketa Selesai — Dana Escrow Dicairkan ke Petani",
            description: `Pengawas sistem menyelesaikan penanganan sengketa dengan mencairkan escrow ke petani. Catatan: ${cleanNote}`,
            linkHref: `/kontrak/${contract.id}/bukti`,
            contractId: contract.id,
          },
        ],
      });

      await tx.auditLog.create({
        data: {
          actorRole: "admin",
          actorName: adminName,
          action: "ADMIN_ESCROW_RELEASED",
          targetType: "contract",
          targetId: contract.id,
          details: `Pengawas mencairkan escrow ${heldPayment.orderId} (${formatIdr(heldPayment.contractAmount)}) ke petani. Catatan: ${cleanNote}`,
        },
      });
    } else {
      const refunded = await tx.payment.updateMany({
        where: { id: heldPayment.id, status: "paid", escrowStatus: "held" },
        data: {
          status: "refunded",
          escrowStatus: "refunded",
          releasedAt: now,
          lastSyncedAt: now,
        },
      });
      if (refunded.count === 0) {
        throw new ApiError(409, "ESCROW_ALREADY_SETTLED", "Status dana escrow telah berubah.");
      }

      const nextStatus = contract.status === "expired" ? "expired" : "cancelled";
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: nextStatus,
          cancelReason: contract.cancelReason || `Dana escrow dikembalikan oleh pengawas: ${cleanNote}`,
          disputeStatus: "resolved_refunded",
          disputeResolutionNote: cleanNote,
          disputeResolvedAt: now,
          disputeResolvedBy: adminName,
        },
      });

      await tx.notification.createMany({
        data: [
          {
            accountId: contract.buyerId,
            type: "kontrak",
            title: "Pengembalian Dana Escrow Disetujui",
            description: `Pengawas sistem memproses pengembalian dana escrow (${formatIdr(heldPayment.grossAmount)}) kepada produsen. Catatan: ${cleanNote}`,
            linkHref: `/kontrak/${contract.id}`,
            contractId: contract.id,
          },
          {
            accountId: contract.offer.ownerId,
            type: "kontrak",
            title: "Kontrak Ditutup — Dana Escrow Dikembalikan ke Produsen",
            description: `Pengawas sistem menutup sengketa dengan pengembalian dana kepada produsen dan memulihkan stok tawaran Anda. Catatan: ${cleanNote}`,
            linkHref: `/kontrak/${contract.id}`,
            contractId: contract.id,
          },
        ],
      });

      await tx.auditLog.create({
        data: {
          actorRole: "admin",
          actorName: adminName,
          action: "ADMIN_ESCROW_REFUNDED",
          targetType: "contract",
          targetId: contract.id,
          details: `Pengawas mengembalikan escrow ${heldPayment.orderId} (${formatIdr(heldPayment.grossAmount)}) kepada produsen. Catatan: ${cleanNote}`,
        },
      });
    }

    const updatedPayment = await tx.payment.findUniqueOrThrow({ where: { id: heldPayment.id } });
    return {
      contractId: contract.id,
      decision,
      payment: presentPayment(updatedPayment),
    };
  });
}
