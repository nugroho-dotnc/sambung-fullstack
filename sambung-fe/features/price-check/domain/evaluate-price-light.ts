/**
 * Pure domain logic for evaluating grain price status relative to local fair price reference.
 * Conforms to Architecture doc Section 6.7 and Clean Code principles (pure function, no side effects).
 */

export type PriceLightStatus =
  | "HIJAU"
  | "KUNING_BAWAH"
  | "KUNING_ATAS"
  | "MERAH"
  | "TIDAK_TERSEDIA";

export interface PriceEvaluationResult {
  status: PriceLightStatus;
  label: string;
  description: string;
  tone: "success" | "warning" | "danger" | "neutral";
  lowerBound: number;
  upperBound: number;
  redThreshold: number;
  isRedAlert: boolean;
}

export interface EvaluatePriceParams {
  price: number;
  lowerBound: number;
  upperBound: number;
  /** Tolerance delta as a decimal (e.g. 0.03 for 3%). Defaults to 0.03 */
  toleranceDelta?: number;
}

export function evaluatePriceLight({
  price,
  lowerBound,
  upperBound,
  toleranceDelta = 0.03,
}: EvaluatePriceParams): PriceEvaluationResult {
  if (!lowerBound || !upperBound || lowerBound <= 0 || upperBound <= 0) {
    return {
      status: "TIDAK_TERSEDIA",
      label: "Acuan Belum Tersedia",
      description: "Data acuan harga wajar untuk wilayah dan komoditas ini belum tersedia.",
      tone: "neutral",
      lowerBound: 0,
      upperBound: 0,
      redThreshold: 0,
      isRedAlert: false,
    };
  }

  // Integer-safe threshold calculation
  const redThreshold = Math.round(lowerBound * (1 - toleranceDelta));

  if (price < redThreshold) {
    return {
      status: "MERAH",
      label: "Jauh di Bawah Rentang Wajar",
      description: `Harga yang Anda masukkan berada di bawah batas toleransi (Rp${redThreshold.toLocaleString("id-ID")}/kg). Menjual di harga ini berisiko merugikan usaha tani Anda.`,
      tone: "danger",
      lowerBound,
      upperBound,
      redThreshold,
      isRedAlert: true,
    };
  }

  if (price < lowerBound) {
    return {
      status: "KUNING_BAWAH",
      label: "Di Bawah Acuan Normal",
      description: `Harga sedikit di bawah rentang acuan wajar (Rp${lowerBound.toLocaleString("id-ID")} - Rp${upperBound.toLocaleString("id-ID")}/kg), namun masih dalam batas toleransi.`,
      tone: "warning",
      lowerBound,
      upperBound,
      redThreshold,
      isRedAlert: false,
    };
  }

  if (price <= upperBound) {
    return {
      status: "HIJAU",
      label: "Dalam Rentang Wajar",
      description: `Harga berada dalam rentang acuan pasar yang wajar (Rp${lowerBound.toLocaleString("id-ID")} - Rp${upperBound.toLocaleString("id-ID")}/kg). Peluang kesepakatan tinggi.`,
      tone: "success",
      lowerBound,
      upperBound,
      redThreshold,
      isRedAlert: false,
    };
  }

  // price > upperBound
  return {
    status: "KUNING_ATAS",
    label: "Di Atas Acuan Normal",
    description: `Harga di atas rentang acuan normal (Rp${lowerBound.toLocaleString("id-ID")} - Rp${upperBound.toLocaleString("id-ID")}/kg). Pastikan mutu gabah Anda sebanding agar menarik bagi pembeli.`,
    tone: "warning",
    lowerBound,
    upperBound,
    redThreshold,
    isRedAlert: false,
  };
}
