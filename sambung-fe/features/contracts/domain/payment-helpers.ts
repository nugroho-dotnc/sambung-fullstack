import type { Contract } from "../schemas";

export const BUYER_FEE_RATE = 0.005;
export const PRO_BUYER_FEE_RATE = 0.0025;

export interface PaymentBreakdown {
  contractAmount: number;
  buyerFeeAmount: number;
  grossAmount: number;
  feeRate: number;
  isProDiscount: boolean;
}

export interface PaymentStatusMeta {
  label: string;
  shortLabel: string;
  tone: "emerald" | "blue" | "amber" | "danger" | "neutral";
}

export interface PaymentDeadlineInfo {
  phase: "none" | "due" | "grace" | "overdue";
  dueAt: Date | null;
  graceEndsAt: Date | null;
  remainingDays: number;
  remainingHours: number;
}

const CHANNEL_LABELS: Record<string, string> = {
  bca: "Virtual Account BCA",
  bni: "Virtual Account BNI",
  bri: "Virtual Account BRI",
  mandiri: "Mandiri Bill Payment",
  permata: "Virtual Account Permata",
  cimb: "Virtual Account CIMB Niaga",
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  credit_card: "Kartu Kredit",
  bank_transfer: "Transfer Bank (VA)",
};

export function getEffectiveBuyerFeeRate(contract: Contract): number {
  if (typeof contract.buyerFeeRate === "number" && contract.buyerFeeRate > 0) {
    return contract.buyerFeeRate;
  }
  return contract.buyerIsPro ? PRO_BUYER_FEE_RATE : BUYER_FEE_RATE;
}

export function formatFeeRatePercent(rate: number): string {
  const pct = Math.round(rate * 10000) / 100;
  return `${pct.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

/**
 * Computes net farmer payout (100%), buyer payment service fee (0.5% or 0.25% Pro), and total Midtrans charge.
 */
export function computeContractPaymentBreakdown(contract: Contract): PaymentBreakdown {
  if (contract.payment && contract.payment.contractAmount > 0) {
    const inferredRate =
      Math.round((contract.payment.buyerFeeAmount / contract.payment.contractAmount) * 10000) /
      10000;
    const feeRate = contract.buyerFeeRate ?? inferredRate;
    return {
      contractAmount: contract.payment.contractAmount,
      buyerFeeAmount: contract.payment.buyerFeeAmount,
      grossAmount: contract.payment.grossAmount,
      feeRate,
      isProDiscount: feeRate < BUYER_FEE_RATE,
    };
  }
  const feeRate = getEffectiveBuyerFeeRate(contract);
  const contractAmount = Math.round(contract.volumeKg * contract.currentPrice);
  const buyerFeeAmount = Math.round(contractAmount * feeRate);
  return {
    contractAmount,
    buyerFeeAmount,
    grossAmount: contractAmount + buyerFeeAmount,
    feeRate,
    isProDiscount: feeRate < BUYER_FEE_RATE,
  };
}

/**
 * Returns true once the authoritative backend payment record is confirmed paid.
 */
export function isContractPaid(contract: Contract): boolean {
  return contract.payment?.status === "paid";
}

/**
 * Formats normalized payment channel or payment type into a readable Indonesian label.
 */
export function formatPaymentChannel(
  payment?: { paymentChannel?: string | null; paymentType?: string | null } | null
): string {
  if (!payment) return "Midtrans Sandbox";
  const channelKey = payment.paymentChannel?.trim().toLowerCase();
  if (channelKey && CHANNEL_LABELS[channelKey]) {
    return CHANNEL_LABELS[channelKey];
  }
  const typeKey = payment.paymentType?.trim().toLowerCase();
  if (typeKey && CHANNEL_LABELS[typeKey]) {
    return CHANNEL_LABELS[typeKey];
  }
  return payment.paymentChannel || payment.paymentType || "Midtrans Sandbox";
}

/**
 * Maps contract and escrow payment states to cohesive status labels and color tones.
 */
export function getPaymentStatusMeta(contract: Contract): PaymentStatusMeta {
  const payment = contract.payment;
  if (payment?.status === "paid") {
    if (payment.escrowStatus === "released") {
      return {
        label: "Dana Escrow Dicairkan",
        shortLabel: "Escrow Dicairkan",
        tone: "emerald",
      };
    }
    return {
      label: "Lunas — Escrow Ditahan",
      shortLabel: "Escrow Ditahan",
      tone: "emerald",
    };
  }
  if (payment?.status === "refunded") {
    return {
      label: "Dana Dikembalikan",
      shortLabel: "Dikembalikan",
      tone: "neutral",
    };
  }
  if (payment?.status === "pending") {
    return {
      label: "Menunggu Pembayaran",
      shortLabel: "Menunggu Bayar",
      tone: "amber",
    };
  }
  if (payment?.status === "expired") {
    return {
      label: "Tagihan Kedaluwarsa",
      shortLabel: "Kedaluwarsa",
      tone: "danger",
    };
  }
  if (payment?.status === "failed") {
    return {
      label: "Pembayaran Gagal",
      shortLabel: "Gagal Bayar",
      tone: "danger",
    };
  }
  if (payment?.status === "cancelled") {
    return {
      label: "Sesi Bayar Dibatalkan",
      shortLabel: "Sesi Batal",
      tone: "neutral",
    };
  }
  if (contract.status === "signed") {
    return {
      label: "Belum Dibayar",
      shortLabel: "Belum Bayar",
      tone: "amber",
    };
  }
  return {
    label: "Belum Waktunya",
    shortLabel: "Belum Ada",
    tone: "neutral",
  };
}

function parseValidDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Evaluates 7-day payment deadline and +3-day grace window relative to caller-supplied timestamp.
 */
export function getPaymentDeadlineInfo(contract: Contract, nowMs: number): PaymentDeadlineInfo {
  const dueAt = parseValidDate(contract.paymentDueAt);
  const graceEndsAt = parseValidDate(contract.paymentGraceEndsAt);

  if ((!dueAt && !graceEndsAt) || isContractPaid(contract)) {
    return {
      phase: "none",
      dueAt,
      graceEndsAt,
      remainingDays: 0,
      remainingHours: 0,
    };
  }

  if (graceEndsAt && nowMs >= graceEndsAt.getTime()) {
    return {
      phase: "overdue",
      dueAt,
      graceEndsAt,
      remainingDays: 0,
      remainingHours: 0,
    };
  }

  if (dueAt && nowMs < dueAt.getTime()) {
    const diffMs = Math.max(0, dueAt.getTime() - nowMs);
    return {
      phase: "due",
      dueAt,
      graceEndsAt,
      remainingDays: Math.ceil(diffMs / 86_400_000),
      remainingHours: Math.ceil(diffMs / 3_600_000),
    };
  }

  if (graceEndsAt) {
    const diffMs = Math.max(0, graceEndsAt.getTime() - nowMs);
    return {
      phase: "grace",
      dueAt,
      graceEndsAt,
      remainingDays: Math.ceil(diffMs / 86_400_000),
      remainingHours: Math.ceil(diffMs / 3_600_000),
    };
  }

  return {
    phase: "due",
    dueAt,
    graceEndsAt,
    remainingDays: 0,
    remainingHours: 0,
  };
}

/**
 * Formats ISO date-time strings concisely in Indonesian locale.
 */
export function formatPaymentDateTime(iso?: string | null): string {
  const date = parseValidDate(iso);
  if (!date) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
