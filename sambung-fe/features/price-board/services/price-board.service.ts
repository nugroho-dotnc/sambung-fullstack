import priceBoardJson from "@/data/ai/price_board_4tier.json";
import {
  SupplyChainComparison,
  HistoricalTrendPoint,
  calculateFarmerShare,
  calculateMargin,
} from "../domain/price-chain";

interface RawTrendPoint {
  week: string;
  weekStart: string;
  farmerPrice: number;
  millerPrice: number;
  wholesalePrice: number;
  retailPrice: number;
}

interface RawBoardProvince {
  province: string;
  farmerEquivPrice: number;
  millerPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  modernPrice: number;
  isDirectProducer: boolean;
  trend12w: RawTrendPoint[];
}

const BOARD_PROVINCES = priceBoardJson.provinces as Record<string, RawBoardProvince>;

export const PRICE_BOARD_META = {
  generatedAtUtc: priceBoardJson.generatedAtUtc,
  updatedAt: priceBoardJson.updatedAt,
  primaryCommodity: priceBoardJson.primaryCommodity,
};

export const AVAILABLE_BOARD_REGIONS: string[] = Object.keys(BOARD_PROVINCES).sort((a, b) => {
  if (a === "Nasional") return -1;
  if (b === "Nasional") return 1;
  return a.localeCompare(b, "id");
});

function resolveBoardRegion(region: string): RawBoardProvince {
  return BOARD_PROVINCES[region] || BOARD_PROVINCES["Jawa Barat"] || BOARD_PROVINCES["Nasional"];
}

function sliceWeeksCount(period: string): number {
  if (period.includes("4 Pekan") || period.includes("30 Hari")) return 4;
  if (period.includes("8 Pekan")) return 8;
  return 12;
}

export class PriceBoardService {
  static getSupplyChainComparison(
    commodity: string = "Beras Medium I",
    region: string = "Jawa Barat",
    period: string = "12 Pekan Terakhir"
  ): SupplyChainComparison {
    const provData = resolveBoardRegion(region);
    const use30dAvg = period.includes("30 Hari");
    const last4 = provData.trend12w.slice(-4);

    let farmerBase = provData.farmerEquivPrice;
    let millerBase = provData.millerPrice;
    let wholesaleBase = provData.wholesalePrice;
    let retailBase = provData.retailPrice;

    if (use30dAvg && last4.length > 0) {
      farmerBase = Math.round(last4.reduce((s, r) => s + r.farmerPrice, 0) / last4.length);
      millerBase = Math.round(last4.reduce((s, r) => s + r.millerPrice, 0) / last4.length);
      wholesaleBase = Math.round(last4.reduce((s, r) => s + r.wholesalePrice, 0) / last4.length);
      retailBase = Math.round(last4.reduce((s, r) => s + r.retailPrice, 0) / last4.length);
    }

    // Commodity view adjustment
    const isPremium = commodity.includes("Premium");
    const isGkpView = commodity.includes("GKP");
    const scale = isPremium ? 1.08 : isGkpView ? 0.5338 : 1.0;

    const farmerPrice = Math.round(farmerBase * scale);
    const millerPrice = Math.round(millerBase * scale);
    const wholesalePrice = Math.round(wholesaleBase * scale);
    const retailPrice = Math.round(retailBase * scale);

    const { marginAmount, marginPercent } = calculateMargin(farmerPrice, retailPrice);
    const farmerSharePercent = calculateFarmerShare(farmerPrice, retailPrice);

    return {
      commodity,
      region: provData.province,
      period,
      farmerPrice,
      retailPrice,
      marginAmount,
      marginPercent,
      farmerSharePercent,
      updatedAt: priceBoardJson.updatedAt,
      levels: [
        {
          id: "petani",
          level: isGkpView ? "Petani Gabah (GKP)" : "Petani Gabah (Setara Beras)",
          price: farmerPrice,
          unit: "Rp/kg",
          note: "Konversi rendemen SKGB 53,38% & rasio empiris Bapanas",
          description: "Nilai ekuivalen beras yang diterima petani sebelum penggilingan.",
          category: "petani",
        },
        {
          id: "penggilingan",
          level: "Penggilingan Padi (Produsen)",
          price: millerPrice,
          unit: "Rp/kg",
          note: `Selisih tahap pengolahan +Rp${Math.max(0, millerPrice - farmerPrice).toLocaleString("id-ID")}`,
          description: provData.isDirectProducer
            ? "Harga jual Beras Medium I di tingkat produsen (PIHPS BI)."
            : "Estimasi setara produsen dari Pasar Tradisional PIHPS.",
          category: "penggilingan",
        },
        {
          id: "grosir",
          level: "Pedagang Besar / Pasar Induk",
          price: wholesalePrice,
          unit: "Rp/kg",
          note: `Marjin perdagangan grosir +Rp${Math.max(0, wholesalePrice - millerPrice).toLocaleString("id-ID")}`,
          description: "Harga transaksi volume besar di tingkat pedagang besar PIHPS.",
          category: "grosir",
        },
        {
          id: "konsumen",
          level: "Pasar Eceran Tradisional (PIHPS)",
          price: retailPrice,
          unit: "Rp/kg",
          note: `Marjin pasar eceran +Rp${Math.max(0, retailPrice - wholesalePrice).toLocaleString("id-ID")}`,
          description: "Harga akhir yang dibayarkan konsumen di pasar tradisional PIHPS.",
          category: "konsumen",
        },
      ],
    };
  }

  static getHistoricalTrends(
    region: string = "Jawa Barat",
    period: string = "12 Pekan Terakhir"
  ): HistoricalTrendPoint[] {
    const provData = resolveBoardRegion(region);
    const nWeeks = sliceWeeksCount(period);
    return provData.trend12w.slice(-nWeeks).map((point) => ({
      week: point.week,
      farmerPrice: point.farmerPrice,
      millerPrice: point.millerPrice,
      retailPrice: point.retailPrice,
    }));
  }
}
