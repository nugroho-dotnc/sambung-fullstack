import { Prisma, type PrismaClient } from "@prisma/client";
import { ApiError } from "../../shared/api-error.ts";
import { isBuyerPro } from "../auth/session.ts";
import {
  cancelTransaction,
  createSnapTransaction,
  extractPaymentMetadata,
  fetchTransactionStatus,
  formatMidtransStartTime,
  isMidtransConfigured,
  mapMidtransStatus,
  readMidtransConfig,
} from "../payments/midtrans.client.ts";
import type { MidtransWebhookPayload } from "../payments/payments.schemas.ts";

export const SUBSCRIPTION_PLAN_CODE = "pembeli_pro_30d";
export const SUBSCRIPTION_PLAN_NAME = "Pembeli Pro";
export const SUBSCRIPTION_PRICE_IDR = 99_000;
export const SUBSCRIPTION_DURATION_DAYS = 30;
export const SUBSCRIPTION_DURATION_MS = SUBSCRIPTION_DURATION_DAYS * 86_400_000;
export const SUBSCRIPTION_SNAP_EXPIRY_MINUTES = 24 * 60;
export const SUBSCRIPTION_REMINDER_WINDOW_MS = 7 * 86_400_000;
export const PRO_BUYER_FEE_RATE = 0.0025;
export const STANDARD_BUYER_FEE_RATE = 0.005;

export interface SubscriptionActor {
  id: string;
  role: string;
}

export type SubscriptionPaymentRecord = Prisma.SubscriptionPaymentGetPayload<Record<string, never>>;

export interface PresentedSubscriptionPayment {
  id: string;
  accountId: string;
  planCode: string;
  attempt: number;
  orderId: string;
  amount: number;
  durationDays: number;
  currency: string;
  provider: string;
  status: string;
  paymentType: string | null;
  paymentChannel: string | null;
  paymentReference: string | null;
  midtransTransactionId: string | null;
  midtransStatus: string | null;
  fraudStatus: string | null;
  redirectUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serializes a database SubscriptionPayment row cleanly without exposing snap tokens or raw webhook blobs.
 */
export function presentSubscriptionPayment(
  row: SubscriptionPaymentRecord
): PresentedSubscriptionPayment {
  return {
    id: row.id,
    accountId: row.accountId,
    planCode: row.planCode,
    attempt: row.attempt,
    orderId: row.orderId,
    amount: row.amount,
    durationDays: row.durationDays,
    currency: row.currency,
    provider: row.provider,
    status: row.status,
    paymentType: row.paymentType,
    paymentChannel: row.paymentChannel,
    paymentReference: row.paymentReference,
    midtransTransactionId: row.midtransTransactionId,
    midtransStatus: row.midtransStatus,
    fraudStatus: row.fraudStatus,
    redirectUrl: row.redirectUrl,
    periodStart: row.periodStart ? row.periodStart.toISOString() : null,
    periodEnd: row.periodEnd ? row.periodEnd.toISOString() : null,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Builds a collision-free Midtrans subscription order_id starting with SUBS-.
 */
export function buildSubscriptionOrderId(accountId: string, attempt: number): string {
  const shortHex = accountId.replace(/-/g, "").slice(0, 16).toUpperCase();
  return `SUBS-${shortHex}-${attempt}`;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function formatDateIndonesian(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Returns the current buyer subscription status, active fee rate, and latest payment attempts.
 */
export async function getSubscriptionMe(db: PrismaClient, actorId: string) {
  const account = await db.account.findUnique({
    where: { id: actorId },
    select: {
      id: true,
      role: true,
      name: true,
      phone: true,
      email: true,
      proExpiresAt: true,
      subscriptionPayments: {
        orderBy: { attempt: "desc" },
        take: 20,
      },
    },
  });

  if (!account) {
    throw new ApiError(404, "NOT_FOUND", "Akun tidak ditemukan.");
  }

  const eligible = account.role === "pembeli";
  const now = new Date();
  const activePro = eligible && isBuyerPro(account, now);
  const remainingDays =
    activePro && account.proExpiresAt
      ? Math.max(1, Math.ceil((account.proExpiresAt.getTime() - now.getTime()) / 86_400_000))
      : 0;

  const status = !eligible
    ? "not_applicable"
    : activePro
    ? "active"
    : account.proExpiresAt
    ? "expired"
    : "free";

  const buyerFeeRate = activePro ? PRO_BUYER_FEE_RATE : STANDARD_BUYER_FEE_RATE;
  const presentedHistory = eligible ? account.subscriptionPayments.map(presentSubscriptionPayment) : [];

  return {
    eligible,
    planCode: SUBSCRIPTION_PLAN_CODE,
    planName: SUBSCRIPTION_PLAN_NAME,
    priceIdr: SUBSCRIPTION_PRICE_IDR,
    durationDays: SUBSCRIPTION_DURATION_DAYS,
    buyerFeeRate,
    standardFeeRate: STANDARD_BUYER_FEE_RATE,
    proFeeRate: PRO_BUYER_FEE_RATE,
    isPro: activePro,
    status,
    proExpiresAt: eligible && account.proExpiresAt ? account.proExpiresAt.toISOString() : null,
    remainingDays,
    latestPayment: presentedHistory[0] ?? null,
    history: presentedHistory,
    midtransConfigured: isMidtransConfigured(),
  };
}

/**
 * Atomically transitions a subscription payment with monotonic safeguards and +30d stacking on settlement.
 */
export async function applySubscriptionStatusTransition(
  db: PrismaClient,
  orderId: string,
  payload: Record<string, unknown>,
  source: "webhook" | "sync" | "checkout_check"
): Promise<{
  payment: PresentedSubscriptionPayment;
  transitionedToPaid: boolean;
  proExpiresAt: string | null;
}> {
  const txStatus = String(payload.transaction_status ?? "pending");
  const fraudStatus = typeof payload.fraud_status === "string" ? payload.fraud_status : null;
  const mapped = mapMidtransStatus(txStatus, fraudStatus);
  const meta = extractPaymentMetadata(payload);
  const now = new Date();
  const rawJson = toJsonInput(payload);

  const lookup = await db.subscriptionPayment.findUnique({
    where: { orderId },
    select: { id: true, accountId: true },
  });
  if (!lookup) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Data pembayaran langganan tidak ditemukan.");
  }

  const txResult = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "account" WHERE id = ${lookup.accountId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "subscription_payment" WHERE "order_id" = ${orderId} FOR UPDATE`;

    const current = await tx.subscriptionPayment.findUnique({
      where: { orderId },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            role: true,
            proExpiresAt: true,
          },
        },
      },
    });
    if (!current) {
      throw new ApiError(404, "ORDER_NOT_FOUND", "Data pembayaran langganan tidak ditemukan.");
    }

    if (payload.gross_amount !== undefined) {
      const incomingAmount = Math.round(Number(payload.gross_amount));
      if (!Number.isFinite(incomingAmount) || incomingAmount !== current.amount) {
        throw new ApiError(
          422,
          "AMOUNT_MISMATCH",
          "Nominal pembayaran Midtrans tidak sesuai dengan tagihan langganan."
        );
      }
    }

    if (current.status === "paid") {
      if (mapped.status === "refunded") {
        const refunded = await tx.subscriptionPayment.update({
          where: { id: current.id },
          data: {
            status: "refunded",
            midtransTransactionId: meta.midtransTransactionId ?? current.midtransTransactionId,
            midtransStatus: meta.midtransStatus ?? current.midtransStatus,
            fraudStatus: meta.fraudStatus ?? current.fraudStatus,
            rawNotification: rawJson,
            lastSyncedAt: now,
          },
        });
        await tx.auditLog.create({
          data: {
            actorRole: "sistem",
            actorName: "Midtrans Sandbox",
            action: "SUBSCRIPTION_REFUNDED",
            targetType: "subscription",
            targetId: current.id,
            details: `Pembayaran langganan ${current.orderId} berstatus refunded melalui ${source}.`,
          },
        });
        return {
          row: refunded,
          transitionedToPaid: false,
          proExpiresAt: current.account.proExpiresAt,
        };
      }

      const refreshed = await tx.subscriptionPayment.update({
        where: { id: current.id },
        data: {
          rawNotification: rawJson,
          lastSyncedAt: now,
        },
      });
      return {
        row: refreshed,
        transitionedToPaid: false,
        proExpiresAt: current.account.proExpiresAt,
      };
    }

    if (mapped.status === "paid") {
      const currentExpiry = current.account.proExpiresAt;
      const baseStart =
        currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
      const periodEnd = new Date(baseStart.getTime() + current.durationDays * 86_400_000);

      const paidRow = await tx.subscriptionPayment.update({
        where: { id: current.id },
        data: {
          status: "paid",
          paidAt: now,
          periodStart: baseStart,
          periodEnd,
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

      await tx.account.update({
        where: { id: current.accountId },
        data: {
          proExpiresAt: periodEnd,
          proReminderSentAt: null,
        },
      });

      await tx.notification.create({
        data: {
          accountId: current.accountId,
          type: "sistem",
          title: "Langganan Pembeli Pro Aktif",
          description: `Paket Pembeli Pro aktif hingga ${formatDateIndonesian(periodEnd)}. Nikmati diskon biaya layanan escrow 0,25%, riwayat harga lengkap 2019–sekarang + CSV, dan Prakiraan AI penuh.`,
          linkHref: "/langganan",
        },
      });

      await tx.auditLog.create({
        data: {
          actorRole: "sistem",
          actorName: "Midtrans Sandbox",
          action: "SUBSCRIPTION_ACTIVATED",
          targetType: "subscription",
          targetId: current.id,
          details: `Langganan ${current.orderId} lunas (Rp${current.amount.toLocaleString("id-ID")}) via ${source}; aktif hingga ${periodEnd.toISOString()}.`,
        },
      });

      return {
        row: paidRow,
        transitionedToPaid: true,
        proExpiresAt: periodEnd,
      };
    }

    const nextStatus = mapped.status === "refunded" ? current.status : mapped.status;
    const updated = await tx.subscriptionPayment.update({
      where: { id: current.id },
      data: {
        status: nextStatus,
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

    return {
      row: updated,
      transitionedToPaid: false,
      proExpiresAt: current.account.proExpiresAt,
    };
  });

  return {
    payment: presentSubscriptionPayment(txResult.row),
    transitionedToPaid: txResult.transitionedToPaid,
    proExpiresAt: txResult.proExpiresAt ? txResult.proExpiresAt.toISOString() : null,
  };
}

/**
 * Initiates or reuses a Midtrans Sandbox Snap checkout session for the 30-day Pembeli Pro package.
 */
export async function checkoutSubscription(
  db: PrismaClient,
  actor: SubscriptionActor,
  options: { recreate?: boolean } = {}
) {
  if (actor.role !== "pembeli") {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Paket Pembeli Pro hanya tersedia untuk akun Pembeli / Penggilingan."
    );
  }

  const config = readMidtransConfig();
  const recreate = options.recreate === true;

  async function reserveOrReuseInTx() {
    try {
      return await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "account" WHERE id = ${actor.id}::uuid FOR UPDATE`;

        const account = await tx.account.findUnique({
          where: { id: actor.id },
          select: {
            id: true,
            role: true,
            name: true,
            phone: true,
            email: true,
            subscriptionPayments: {
              orderBy: { attempt: "desc" },
            },
          },
        });
        if (!account) {
          throw new ApiError(404, "NOT_FOUND", "Akun tidak ditemukan.");
        }

        const now = new Date();
        const pending = account.subscriptionPayments.find((p) => p.status === "pending");
        if (pending) {
          if (!pending.snapToken) {
            const ageMs = now.getTime() - pending.createdAt.getTime();
            if (ageMs < config.timeoutMs + 5000) {
              throw new ApiError(
                409,
                "PAYMENT_IN_PROGRESS",
                "Permintaan sesi pembayaran langganan sedang diproses. Silakan tunggu sebentar lalu muat ulang."
              );
            }
            await tx.subscriptionPayment.update({
              where: { id: pending.id },
              data: { status: "failed", lastSyncedAt: now },
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

        const latestAttempt = account.subscriptionPayments.reduce(
          (max, item) => (item.attempt > max ? item.attempt : max),
          0
        );
        const attempt = latestAttempt + 1;
        const orderId = buildSubscriptionOrderId(account.id, attempt);
        const expiresAt = new Date(now.getTime() + SUBSCRIPTION_SNAP_EXPIRY_MINUTES * 60_000);

        const reserved = await tx.subscriptionPayment.create({
          data: {
            accountId: account.id,
            planCode: SUBSCRIPTION_PLAN_CODE,
            attempt,
            orderId,
            amount: SUBSCRIPTION_PRICE_IDR,
            durationDays: SUBSCRIPTION_DURATION_DAYS,
            currency: "IDR",
            provider: "midtrans_sandbox",
            status: "pending",
            expiresAt,
          },
        });

        return {
          kind: "created" as const,
          reserved,
          account,
          now,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiError(
          409,
          "PAYMENT_IN_PROGRESS",
          "Sesi pembayaran langganan sedang diproses. Silakan coba beberapa saat lagi."
        );
      }
      throw error;
    }
  }

  let step = await reserveOrReuseInTx();

  if (step.kind === "reuse") {
    return {
      payment: presentSubscriptionPayment(step.payment),
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
        await applySubscriptionStatusTransition(db, existing.orderId, remote.data, "checkout_check");
        throw new ApiError(
          409,
          "ALREADY_SETTLED",
          "Pembayaran langganan sebelumnya baru saja terkonfirmasi lunas di Midtrans Sandbox."
        );
      }
      if (mapped.status === "pending" && (recreate || step.isExpired)) {
        await cancelTransaction(config, existing.orderId);
      }
      if (mapped.status === "expired" || mapped.status === "failed" || mapped.status === "cancelled") {
        nextStatus = mapped.status;
      }
    }

    await db.subscriptionPayment.updateMany({
      where: { id: existing.id, status: "pending" },
      data: {
        status: nextStatus,
        lastSyncedAt: new Date(),
      },
    });

    step = await reserveOrReuseInTx();
    if (step.kind === "reuse") {
      return {
        payment: presentSubscriptionPayment(step.payment),
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

  const { reserved, account, now } = step;

  try {
    const snap = await createSnapTransaction(config, {
      orderId: reserved.orderId,
      grossAmount: reserved.amount,
      items: [
        {
          id: SUBSCRIPTION_PLAN_CODE,
          price: reserved.amount,
          quantity: 1,
          name: "Langganan SAMBUNG Pembeli Pro (30 Hari)",
        },
      ],
      customer: {
        firstName: account.name,
        phone: account.phone,
        email: account.email,
      },
      expiry: {
        startTime: formatMidtransStartTime(now),
        unit: "minutes",
        duration: SUBSCRIPTION_SNAP_EXPIRY_MINUTES,
      },
    });

    const saved = await db.$transaction(async (tx) => {
      const updated = await tx.subscriptionPayment.update({
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
          actorName: account.name,
          action: "SUBSCRIPTION_CHECKOUT_INITIATED",
          targetType: "subscription",
          targetId: updated.id,
          details: `Membuat sesi pembayaran langganan Pembeli Pro ${reserved.orderId} (Rp${reserved.amount.toLocaleString("id-ID")}).`,
        },
      });
      return updated;
    });

    return {
      payment: presentSubscriptionPayment(saved),
      snapToken: snap.token,
      redirectUrl: snap.redirectUrl,
      clientKey: config.clientKey,
      snapScriptUrl: config.snapScriptUrl,
    };
  } catch (err) {
    await db.subscriptionPayment.updateMany({
      where: { id: reserved.id, status: "pending" },
      data: {
        status: "failed",
        lastSyncedAt: new Date(),
      },
    });
    throw err;
  }
}

/**
 * Queries Midtrans Sandbox Status API for the caller's subscription payment attempt.
 */
export async function syncSubscriptionPayment(
  db: PrismaClient,
  actor: SubscriptionActor,
  options: { orderId?: string } = {}
) {
  if (actor.role !== "pembeli") {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Paket Pembeli Pro hanya tersedia untuk akun Pembeli / Penggilingan."
    );
  }

  const config = readMidtransConfig();
  const targetRow = options.orderId
    ? await db.subscriptionPayment.findFirst({
        where: { accountId: actor.id, orderId: options.orderId },
      })
    : await db.subscriptionPayment.findFirst({
        where: { accountId: actor.id },
        orderBy: { attempt: "desc" },
      });

  if (!targetRow) {
    throw new ApiError(
      404,
      "PAYMENT_NOT_FOUND",
      "Belum ada riwayat tagihan langganan Pembeli Pro yang dibuat."
    );
  }

  if (targetRow.status === "paid" || targetRow.status === "refunded") {
    return {
      subscription: await getSubscriptionMe(db, actor.id),
      payment: presentSubscriptionPayment(targetRow),
      synced: false,
      awaitingMethodSelection: false,
    };
  }

  const remote = await fetchTransactionStatus(config, targetRow.orderId);
  if (!remote.found) {
    const now = new Date();
    const isExpired = Boolean(targetRow.expiresAt && now.getTime() >= targetRow.expiresAt.getTime());
    const refreshed = await db.subscriptionPayment.update({
      where: { id: targetRow.id },
      data: {
        ...(isExpired && targetRow.status === "pending" ? { status: "expired" } : {}),
        lastSyncedAt: now,
      },
    });
    return {
      subscription: await getSubscriptionMe(db, actor.id),
      payment: presentSubscriptionPayment(refreshed),
      synced: true,
      awaitingMethodSelection: !isExpired && refreshed.status === "pending",
    };
  }

  if (remote.data.gross_amount !== undefined) {
    const remoteAmount = Math.round(Number(remote.data.gross_amount));
    if (!Number.isFinite(remoteAmount) || remoteAmount !== targetRow.amount) {
      throw new ApiError(
        422,
        "AMOUNT_MISMATCH",
        "Nominal status pembayaran Midtrans tidak cocok dengan tagihan langganan."
      );
    }
  }

  const result = await applySubscriptionStatusTransition(db, targetRow.orderId, remote.data, "sync");
  return {
    subscription: await getSubscriptionMe(db, actor.id),
    payment: result.payment,
    synced: true,
    awaitingMethodSelection: false,
  };
}

/**
 * Processes verified Midtrans Sandbox webhook payloads for subscription order IDs (SUBS-*).
 */
export async function handleSubscriptionMidtransWebhook(
  db: PrismaClient,
  payload: MidtransWebhookPayload
) {
  const existing = await db.subscriptionPayment.findUnique({
    where: { orderId: payload.order_id },
  });
  if (!existing) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order ID langganan tidak ditemukan pada sistem.");
  }

  const incomingAmount = Math.round(Number(payload.gross_amount));
  if (!Number.isFinite(incomingAmount) || incomingAmount !== existing.amount) {
    throw new ApiError(422, "AMOUNT_MISMATCH", "Nominal pembayaran pada webhook tidak sesuai dengan tagihan.");
  }

  const result = await applySubscriptionStatusTransition(db, payload.order_id, payload, "webhook");
  return {
    received: true,
    orderId: result.payment.orderId,
    status: result.payment.status,
    proExpiresAt: result.proExpiresAt,
  };
}

/**
 * Sends a one-time notification when an active Pembeli Pro subscription has fewer than 7 days left.
 */
export async function sendSubscriptionExpiryReminders(
  db: PrismaClient,
  now: Date = new Date()
): Promise<number> {
  const threshold = new Date(now.getTime() + SUBSCRIPTION_REMINDER_WINDOW_MS);
  const expiringBuyers = await db.account.findMany({
    where: {
      role: "pembeli",
      proExpiresAt: { gt: now, lte: threshold },
      proReminderSentAt: null,
    },
    select: {
      id: true,
      proExpiresAt: true,
    },
  });

  let sentCount = 0;
  for (const buyer of expiringBuyers) {
    const proExpiresAt = buyer.proExpiresAt;
    if (!proExpiresAt) continue;
    const claimed = await db.$transaction(async (tx) => {
      const updated = await tx.account.updateMany({
        where: {
          id: buyer.id,
          role: "pembeli",
          proExpiresAt: { gt: now, lte: threshold },
          proReminderSentAt: null,
        },
        data: { proReminderSentAt: now },
      });
      if (updated.count === 0) return false;

      const remainingDays = Math.max(
        1,
        Math.ceil((proExpiresAt.getTime() - now.getTime()) / 86_400_000)
      );

      await tx.notification.create({
        data: {
          accountId: buyer.id,
          type: "sistem",
          title: "Masa Aktif Pembeli Pro Segera Berakhir",
          description: `Langganan Pembeli Pro Anda tersisa ${remainingDays} hari (berakhir ${formatDateIndonesian(proExpiresAt)}). Perpanjang sekarang agar sisa hari tetap disambung +30 hari.`,
          linkHref: "/langganan",
        },
      });

      return true;
    });

    if (claimed) sentCount += 1;
  }

  return sentCount;
}
