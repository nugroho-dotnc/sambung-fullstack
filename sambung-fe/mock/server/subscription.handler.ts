import { ApiError } from "@/lib/api/errors";
import type { SubscriptionPayment } from "@/features/subscription/schemas";
import { readDb, writeDb, type MockDatabase } from "./db";
import type { UserProfile } from "@/features/auth/schemas";

const SUBSCRIPTION_PLAN_CODE = "pembeli_pro";
const SUBSCRIPTION_PLAN_NAME = "Pembeli Pro";
const SUBSCRIPTION_PRICE_IDR = 99_000;
const SUBSCRIPTION_DURATION_DAYS = 30;
const SUBSCRIPTION_PENDING_MINUTES = 15;

function syncUserEntitlement(
  db: MockDatabase,
  user: UserProfile,
  patch: Partial<Pick<UserProfile, "isPro" | "proExpiresAt" | "subscriptionPlan">>
) {
  Object.assign(user, patch);
  const stored = db.users.find((u) => u.id === user.id);
  if (stored) {
    Object.assign(stored, patch);
  }
  if (db.currentSession?.id === user.id) {
    Object.assign(db.currentSession, patch);
  }
}

function buildSubscriptionMe(
  db: MockDatabase,
  user: UserProfile,
  now: Date
) {
  const isEligible = user.role === "pembeli";
  const proExpiresAt = user.proExpiresAt ?? null;
  const expiresMs = proExpiresAt ? new Date(proExpiresAt).getTime() : 0;
  const isPro = isEligible && Number.isFinite(expiresMs) && expiresMs > now.getTime();
  const remainingDays = isPro
    ? Math.max(1, Math.ceil((expiresMs - now.getTime()) / 86_400_000))
    : 0;
  const status = !isEligible
    ? "not_applicable"
    : isPro
    ? "active"
    : proExpiresAt
    ? "expired"
    : "free";

  const history = (db.subscriptionPayments ?? [])
    .filter((item) => item.accountId === user.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return {
    eligible: isEligible,
    planCode: SUBSCRIPTION_PLAN_CODE,
    planName: SUBSCRIPTION_PLAN_NAME,
    priceIdr: SUBSCRIPTION_PRICE_IDR,
    durationDays: SUBSCRIPTION_DURATION_DAYS,
    buyerFeeRate: isPro ? 0.0025 : 0.005,
    standardFeeRate: 0.005,
    proFeeRate: 0.0025,
    isPro,
    status,
    proExpiresAt,
    remainingDays,
    latestPayment: history[0] ?? null,
    history,
    midtransConfigured: true,
  };
}

/**
 * Handles Pembeli Pro subscription endpoints when running in frontend mock mode.
 */
export function handleSubscriptionRequest(
  path: string,
  method: string,
  body: unknown
): unknown {
  const db = readDb();
  const user = db.currentSession;
  if (!user) {
    throw new ApiError("Masuk terlebih dahulu.", 401, "UNAUTHENTICATED");
  }

  db.subscriptionPayments ??= [];
  const now = new Date();
  const route = path.split("?")[0];

  if (route === "/subscription/me" && method === "GET") {
    return { data: buildSubscriptionMe(db, user, now) };
  }

  if (user.role !== "pembeli") {
    throw new ApiError(
      "Hanya akun pembeli yang dapat mengaktifkan paket Pembeli Pro.",
      403,
      "FORBIDDEN"
    );
  }

  if (route === "/subscription/checkout" && method === "POST") {
    const recreate = Boolean(
      body && typeof body === "object" && (body as { recreate?: boolean }).recreate
    );
    const existingPending = db.subscriptionPayments.find(
      (item) => item.accountId === user.id && item.status === "pending"
    );

    if (existingPending && !recreate) {
      return {
        data: {
          payment: existingPending,
          snapToken: `mock-snap-${existingPending.orderId}`,
          redirectUrl:
            existingPending.redirectUrl ??
            `https://app.sandbox.midtrans.com/snap/v2/vtweb/${existingPending.orderId}`,
          clientKey: "SB-Mid-client-mock",
          snapScriptUrl: "https://app.sandbox.midtrans.com/snap/snap.js",
        },
      };
    }

    if (existingPending && recreate) {
      existingPending.status = "cancelled";
      existingPending.updatedAt = now.toISOString();
      existingPending.lastSyncedAt = now.toISOString();
    }

    const attempt =
      db.subscriptionPayments
        .filter((item) => item.accountId === user.id)
        .reduce((max, item) => Math.max(max, item.attempt), 0) + 1;
    const orderId = `SUBS-${user.id}-${attempt}-${now.getTime()}`;
    const redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${orderId}`;
    const expiresAt = new Date(
      now.getTime() + SUBSCRIPTION_PENDING_MINUTES * 60_000
    ).toISOString();

    const payment: SubscriptionPayment = {
      id: `sub-pay-${now.getTime()}-${attempt}`,
      accountId: user.id,
      planCode: SUBSCRIPTION_PLAN_CODE,
      attempt,
      orderId,
      amount: SUBSCRIPTION_PRICE_IDR,
      durationDays: SUBSCRIPTION_DURATION_DAYS,
      currency: "IDR",
      provider: "midtrans_sandbox",
      status: "pending",
      redirectUrl,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    db.subscriptionPayments.push(payment);
    writeDb(db);

    return {
      data: {
        payment,
        snapToken: `mock-snap-${orderId}`,
        redirectUrl,
        clientKey: "SB-Mid-client-mock",
        snapScriptUrl: "https://app.sandbox.midtrans.com/snap/snap.js",
      },
    };
  }

  if (route === "/subscription/sync" && method === "POST") {
    const requestedOrderId =
      body && typeof body === "object"
        ? (body as { orderId?: string }).orderId
        : undefined;
    const userPayments = db.subscriptionPayments
      .filter((item) => item.accountId === user.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    const target = requestedOrderId
      ? userPayments.find((item) => item.orderId === requestedOrderId)
      : userPayments[0];

    if (!target) {
      throw new ApiError(
        "Belum ada tagihan langganan Pembeli Pro untuk akun ini.",
        404,
        "PAYMENT_NOT_FOUND"
      );
    }

    if (target.status === "pending") {
      const currentExpiryMs = user.proExpiresAt
        ? new Date(user.proExpiresAt).getTime()
        : 0;
      const baseStart =
        Number.isFinite(currentExpiryMs) && currentExpiryMs > now.getTime()
          ? new Date(currentExpiryMs)
          : now;
      const periodEnd = new Date(
        baseStart.getTime() + SUBSCRIPTION_DURATION_DAYS * 86_400_000
      );

      target.status = "paid";
      target.paymentType = "qris";
      target.paymentChannel = "QRIS (Simulasi Mock)";
      target.midtransStatus = "settlement";
      target.fraudStatus = "accept";
      target.paidAt = now.toISOString();
      target.periodStart = baseStart.toISOString();
      target.periodEnd = periodEnd.toISOString();
      target.lastSyncedAt = now.toISOString();
      target.updatedAt = now.toISOString();

      syncUserEntitlement(db, user, {
        isPro: true,
        proExpiresAt: periodEnd.toISOString(),
        subscriptionPlan: "pro",
      });
      writeDb(db);
    }

    return {
      data: {
        subscription: buildSubscriptionMe(db, user, now),
        payment: target,
        synced: true,
        awaitingMethodSelection: false,
      },
    };
  }

  if (route === "/subscription/cancel" && method === "POST") {
    const requestedOrderId =
      body && typeof body === "object"
        ? (body as { orderId?: string }).orderId
        : undefined;
    const userPayments = db.subscriptionPayments
      .filter((item) => item.accountId === user.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    const target = requestedOrderId
      ? userPayments.find((item) => item.orderId === requestedOrderId)
      : userPayments[0];

    if (!target) {
      throw new ApiError(
        "Belum ada tagihan langganan Pembeli Pro untuk akun ini.",
        404,
        "PAYMENT_NOT_FOUND"
      );
    }
    if (target.status === "paid") {
      throw new ApiError(
        "Pembayaran langganan ini sudah tercatat lunas.",
        409,
        "ALREADY_SETTLED"
      );
    }
    if (target.status !== "pending") {
      throw new ApiError(
        "Tidak ada tagihan aktif yang menunggu pembayaran.",
        409,
        "INVALID_PAYMENT_STATE"
      );
    }

    target.status = "cancelled";
    target.lastSyncedAt = now.toISOString();
    target.updatedAt = now.toISOString();
    writeDb(db);

    return {
      data: {
        subscription: buildSubscriptionMe(db, user, now),
        payment: target,
        synced: true,
        awaitingMethodSelection: false,
      },
    };
  }

  throw new ApiError(
    `Rute langganan '${path}' [${method}] tidak ditemukan.`,
    404,
    "NOT_FOUND"
  );
}
