/**
 * Pure domain logic and finite state machine for SAMBUNG contracts.
 * Enforces business rules (BR-018 contact masking, BR-021 atomic transitions, Robert C. Martin Clean Code).
 */

export type ContractStatus =
  | "pending"    // Menunggu kesepakatan harga / respons negosiasi
  | "approved"   // Harga disepakati kedua belah pihak (Kontak dibuka)
  | "completed"  // Serah terima gabah fisik telah dikonfirmasi tuntas oleh kedua pihak
  | "rejected"   // Tawaran ditolak oleh salah satu pihak
  | "cancelled"  // Pesanan dibatalkan
  | "expired";   // Batas waktu 24 jam terlewati tanpa kesepakatan

export interface ContractTransitionRule {
  from: ContractStatus;
  to: ContractStatus;
  allowedRoles: ("petani" | "pembeli" | "admin")[];
  description: string;
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, { label: string; tone: "amber" | "emerald" | "blue" | "neutral" | "danger" }> = {
  pending: { label: "Menunggu Kesepakatan", tone: "amber" },
  approved: { label: "Disetujui Bersama", tone: "emerald" },
  completed: { label: "Transaksi Selesai", tone: "blue" },
  rejected: { label: "Ditolak", tone: "danger" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
  expired: { label: "Kedaluwarsa", tone: "neutral" },
};

/**
 * Checks if counterparty contact details (phone, WhatsApp, exact address) should be revealed.
 * STRICT RULE (BR-018): Contact details are completely hidden until status is "approved" or "completed".
 */
export function isContactRevealed(status: ContractStatus): boolean {
  return status === "approved";
}

/**
 * Validates whether a state transition is legal according to the contract lifecycle.
 */
export function canTransitionContract(
  from: ContractStatus,
  to: ContractStatus
): boolean {
  if (from === to) return true;

  switch (from) {
    case "pending":
      return to === "approved" || to === "rejected" || to === "cancelled" || to === "expired";
    case "approved":
      return to === "completed" || to === "cancelled";
    case "completed":
    case "rejected":
    case "cancelled":
    case "expired":
      return false; // Terminal states
    default:
      return false;
  }
}

/**
 * Determines whose turn it is to act in a pending negotiation.
 */
export function getNextNegotiationTurn(currentTurn: "petani" | "pembeli"): "petani" | "pembeli" {
  return currentTurn === "petani" ? "pembeli" : "petani";
}

/**
 * Checks if 24-hour negotiation deadline has expired.
 */
export function isContractExpired(expiresAt: string, now: number = Date.now()): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  return Number.isFinite(expiryTime) && now >= expiryTime;
}
