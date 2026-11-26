import type { UserProfile } from "@/features/auth/schemas";
import type { HarvestOffer } from "@/features/offers/schemas";
import type { Contract } from "@/features/contracts/schemas";
import type {
  AuditLogEntry,
  PriceObservationRecord,
} from "@/features/admin/domain/admin-types";

export interface MockDatabase {
  users: UserProfile[];
  currentSession: UserProfile | null;
  pendingOtp: Record<string, { code: string; expiresAt: number }>;
  offers: HarvestOffer[];
  contracts: Contract[];
  observations: PriceObservationRecord[];
  parameters: {
    orderExpiryHours: number;
    fairPriceToleranceDelta: number;
    rendemenGKP: number;
    rendemenGKG: number;
    governmentFloorPriceGKP?: number;
    lastUpdated: string;
  };
  auditLogs: AuditLogEntry[];
}

const STORAGE_KEY = "sambung:mockdb:v1";

export const SEED_USERS: UserProfile[] = [
  {
    id: "usr-petani-01",
    role: "petani",
    name: "Pak Subur",
    phone: "081234567890",
    province: "Jawa Barat",
    regency: "Subang",
    district: "Pagaden",
    businessName: "Poktan Subur Makmur",
    status: "active",
  },
  {
    id: "usr-pembeli-01",
    role: "pembeli",
    name: "H. Hendra",
    phone: "081398765432",
    province: "Jawa Barat",
    regency: "Karawang",
    district: "Telagasari",
    businessName: "CV Sumber Pangan Nusantara",
    status: "active",
  },
  {
    id: "usr-admin-01",
    role: "admin",
    name: "Pengelola Pusat SAMBUNG",
    phone: "081122334455",
    email: "admin@sambung.id",
    province: "DKI Jakarta",
    regency: "Jakarta Pusat",
    district: "Gambir",
    businessName: "Badan Layanan Agrikultur",
    status: "active",
  },
];

export const INITIAL_PARAMETERS = {
  orderExpiryHours: 24,
  fairPriceToleranceDelta: 0.03, // 3%
  rendemenGKP: 0.5338,
  rendemenGKG: 0.63,
  governmentFloorPriceGKP: 6000,
  lastUpdated: "2026-11-20T10:00:00.000Z",
};

export const SEED_OBSERVATIONS: PriceObservationRecord[] = [
  {
    id: "obs-01",
    province: "Jawa Timur",
    commodity: "Gabah Kering Panen (GKP)",
    price: 6750,
    unit: "Rp/kg",
    source: "Bapanas Produsen",
    period: "Pekan 47 (Nov 2026)",
    status: "Valid",
  },
  {
    id: "obs-02",
    province: "Jawa Tengah",
    commodity: "Gabah Kering Panen (GKP)",
    price: 6800,
    unit: "Rp/kg",
    source: "PIHPS",
    period: "Pekan 47 (Nov 2026)",
    status: "Valid",
  },
  {
    id: "obs-03",
    province: "Jawa Barat",
    commodity: "Gabah Kering Panen (GKP)",
    price: 7200,
    unit: "Rp/kg",
    source: "Bapanas Produsen",
    period: "Pekan 47 (Nov 2026)",
    status: "Valid",
  },
  {
    id: "obs-04",
    province: "Sulawesi Selatan",
    commodity: "Gabah Kering Panen (GKP)",
    price: 6300,
    unit: "Rp/kg",
    source: "Bapanas Produsen",
    period: "Pekan 47 (Nov 2026)",
    status: "Valid",
  },
  {
    id: "obs-05",
    province: "Kalimantan Selatan",
    commodity: "Gabah Kering Panen (GKP)",
    price: -450,
    unit: "Rp/kg",
    source: "Kandidat Ingest API",
    period: "Pekan 47 (Nov 2026)",
    status: "Ditolak",
    reason: "Harga bernilai negatif atau nol tidak diizinkan masuk sistem observasi.",
  },
  {
    id: "obs-06",
    province: "Sumatera Utara",
    commodity: "Gabah Kering Panen (GKP)",
    price: 18500,
    unit: "Rp/kg",
    source: "Kandidat Ingest API",
    period: "Pekan 47 (Nov 2026)",
    status: "Anomali",
    reason: "Deviasi ekstrem >150% terhadap median nasional (6.700).",
  },
];

export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-01",
    timestamp: "2026-11-20T08:00:00.000Z",
    actorRole: "sistem",
    actorName: "Infrastruktur SAMBUNG",
    action: "Inisialisasi Sistem",
    targetType: "DataHarga",
    targetId: "sys-init",
    details: "Snapshot parameter pasar dan 34 acuan provinsi berhasil dimuat.",
  },
  {
    id: "log-02",
    timestamp: "2026-11-20T08:15:00.000Z",
    actorRole: "petani",
    actorName: "Pak Subur",
    action: "Penerbitan Penawaran",
    targetType: "PenawaranPanen",
    targetId: "of-01",
    details: "Menerbitkan kuota 5.000 kg Gabah Kering Panen pada harga Rp7.200/kg (Zona Hijau Wajar).",
  },
  {
    id: "log-03",
    timestamp: "2026-11-20T09:30:00.000Z",
    actorRole: "pembeli",
    actorName: "H. Hendra",
    action: "Pengajuan Pesanan Parsial",
    targetType: "KontrakKesepakatan",
    targetId: "ctr-882101",
    details: "Mengajukan pesanan parsial 2.000 kg dari tawaran #of-01 dengan tawaran awal Rp7.100/kg.",
  },
  {
    id: "log-04",
    timestamp: "2026-11-20T09:30:01.000Z",
    actorRole: "sistem",
    actorName: "Atomic Locker",
    action: "Pencadangan Volume Atomik",
    targetType: "PenawaranPanen",
    targetId: "of-01",
    details: "Cadangan 2.000 kg dikunci otomatis. Sisa volume tersedia berubah menjadi 3.000 kg.",
  },
  {
    id: "log-05",
    timestamp: "2026-11-20T10:45:00.000Z",
    actorRole: "petani",
    actorName: "Pak Subur",
    action: "Tawar Balik Negosiasi",
    targetType: "KontrakKesepakatan",
    targetId: "ctr-882101",
    details: "Mengajukan tawar balik harga ke Rp7.150/kg dengan catatan mutu kadar air prima.",
  },
  {
    id: "log-06",
    timestamp: "2026-11-20T11:20:00.000Z",
    actorRole: "pembeli",
    actorName: "H. Hendra",
    action: "Persetujuan Kesepakatan",
    targetType: "KontrakKesepakatan",
    targetId: "ctr-771904",
    details: "Menyetujui harga Rp8.300/kg untuk 1.500 kg GKG. Kontak dua pihak saling terbuka otomatis.",
  },
];

function getInitialDatabase(): MockDatabase {
  return {
    users: [...SEED_USERS],
    currentSession: null, // Default: belum login (Publik)
    pendingOtp: {},
    offers: [
      {
        id: "of-01",
        ownerId: "usr-petani-01",
        farmerName: "Pak Subur",
        grainType: "GKP",
        province: "Jawa Barat",
        regency: "Subang",
        district: "Pagaden",
        districtId: "Pagaden",
        totalVolumeKg: 5000,
        availableVolumeKg: 3000,
        reservedVolumeKg: 2000,
        approvedVolumeKg: 0,
        completedVolumeKg: 0,
        askPrice: 7200,
        quality: 22.5,
        availableOn: "2026-11-25",
        status: "published",
        typeLocationLocked: true,
        version: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: "of-02",
        ownerId: "usr-petani-01",
        farmerName: "Pak Subur",
        grainType: "GKG",
        province: "Jawa Barat",
        regency: "Subang",
        district: "Pagaden",
        districtId: "Pagaden",
        totalVolumeKg: 3500,
        availableVolumeKg: 3500,
        reservedVolumeKg: 0,
        approvedVolumeKg: 0,
        completedVolumeKg: 0,
        askPrice: 8300,
        quality: 14.0,
        availableOn: "2026-11-28",
        status: "published",
        typeLocationLocked: false,
        version: 1,
        createdAt: new Date().toISOString(),
      },
    ],
    contracts: [
      {
        id: "ctr-882101",
        offerId: "of-01",
        farmerId: "usr-petani-01",
        farmerName: "Pak Subur",
        farmerPhone: "081234567890",
        farmerBusiness: "Poktan Subur Makmur",
        buyerId: "usr-pembeli-01",
        buyerName: "H. Hendra",
        buyerPhone: "081398765432",
        buyerBusiness: "CV Sumber Pangan Nusantara",
        grainType: "GKP",
        volumeKg: 2000,
        initialPrice: 7100,
        currentPrice: 7150,
        farmerAskPrice: 7200,
        status: "pending",
        currentTurnRole: "petani",
        expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
        farmerConfirmed: false,
        buyerConfirmed: false,
        cancelReason: null,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        province: "Jawa Barat",
        regency: "Subang",
        district: "Pagaden",
        history: [
          {
            id: "hist-01",
            role: "pembeli",
            authorName: "H. Hendra",
            price: 7100,
            note: "Kami siap jemput langsung di Pagaden.",
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "hist-02",
            role: "petani",
            authorName: "Pak Subur",
            price: 7150,
            note: "Kadar air panen sangat bagus, mohon pertimbangkan Rp7.150/kg.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
      {
        id: "ctr-771904",
        offerId: "of-02",
        farmerId: "usr-petani-01",
        farmerName: "Pak Subur",
        farmerPhone: "081234567890",
        farmerBusiness: "Poktan Subur Makmur",
        buyerId: "usr-pembeli-01",
        buyerName: "H. Hendra",
        buyerPhone: "081398765432",
        buyerBusiness: "CV Sumber Pangan Nusantara",
        grainType: "GKG",
        volumeKg: 1500,
        initialPrice: 8300,
        currentPrice: 8300,
        farmerAskPrice: 8300,
        status: "approved",
        currentTurnRole: "pembeli",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        farmerConfirmed: false,
        buyerConfirmed: false,
        cancelReason: null,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        province: "Jawa Barat",
        regency: "Subang",
        district: "Pagaden",
        history: [
          {
            id: "hist-11",
            role: "pembeli",
            authorName: "H. Hendra",
            price: 8300,
            note: "Sepakat dengan harga minta petani.",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "hist-12",
            role: "petani",
            authorName: "Pak Subur",
            price: 8300,
            note: "Harga Rp8.300/kg telah disetujui bersama.",
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
    ],
    observations: [...SEED_OBSERVATIONS],
    parameters: INITIAL_PARAMETERS,
    auditLogs: [...SEED_AUDIT_LOGS],
  };
}

export function readDb(): MockDatabase {
  if (typeof window === "undefined") {
    return getInitialDatabase();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDatabase();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const db = JSON.parse(raw) as MockDatabase;

    let changed = false;

    // Auto-heal observations if empty
    if (!db.observations || !Array.isArray(db.observations) || db.observations.length === 0) {
      db.observations = [...SEED_OBSERVATIONS];
      changed = true;
    }

    // Auto-heal auditLogs if empty or short
    if (!db.auditLogs || !Array.isArray(db.auditLogs) || db.auditLogs.length <= 1) {
      db.auditLogs = [...SEED_AUDIT_LOGS];
      changed = true;
    }

    // Auto-heal parameters
    if (!db.parameters || !db.parameters.governmentFloorPriceGKP) {
      db.parameters = { ...INITIAL_PARAMETERS, ...(db.parameters || {}) };
      changed = true;
    }

    // Auto-heal any offers that might lack districtId
    if (db.offers && Array.isArray(db.offers)) {
      db.offers.forEach((offer) => {
        if (!offer.districtId) {
          offer.districtId = offer.district || "Pagaden";
          changed = true;
        }
        if (!offer.district) {
          offer.district = offer.districtId || "Pagaden";
          changed = true;
        }
        if (!offer.moderationStatus) {
          offer.moderationStatus = "Bersih";
          changed = true;
        }
      });
    }

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }

    return db;
  } catch (error) {
    console.error("Gagal membaca mock database dari localStorage:", error);
    return getInitialDatabase();
  }
}

export function writeDb(db: MockDatabase): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error("Gagal menulis ke mock database:", error);
  }
}

export function resetDb(): MockDatabase {
  const initial = getInitialDatabase();
  writeDb(initial);
  return initial;
}
