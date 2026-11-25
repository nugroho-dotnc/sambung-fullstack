import { ApiError } from "@/lib/api/errors";
import { readDb } from "./db";
import type { CatalogItem } from "@/features/catalog/schemas";

export function handleCatalogRequest(path: string, method: string): unknown {
  const db = readDb();

  const match = /^\/catalog(?:\/([^/]+))?$/.exec(path);
  if (!match) throw new ApiError("Endpoint katalog tidak ditemukan.", 404, "NOT_FOUND");

  const id = match[1] ? decodeURIComponent(match[1]) : undefined;

  if (method !== "GET") {
    throw new ApiError("Metode HTTP tidak didukung.", 405, "METHOD_NOT_ALLOWED");
  }

  // GET /catalog/:id
  if (id) {
    const offer = db.offers.find((o) => o.id === id);
    if (!offer || offer.status !== "published") {
      throw new ApiError("Pasokan panen tidak ditemukan di katalog.", 404, "NOT_FOUND");
    }

    const farmer = db.users.find((u) => u.id === offer.ownerId);

    const item: CatalogItem = {
      ...offer,
      farmerBusiness: farmer?.businessName || "Kelompok Tani",
      isDirectFarmer: true,
    };

    return { data: item };
  }

  // GET /catalog (with query parameters)
  const url = new URL(`http://localhost${path}`);
  const grainType = url.searchParams.get("grainType");
  const regency = url.searchParams.get("regency");
  const district = url.searchParams.get("district");
  const search = url.searchParams.get("search");

  // Only published offers with available volume > 0 are visible in the buyer catalog
  let items: CatalogItem[] = db.offers
    .filter((o) => o.status === "published" && o.availableVolumeKg > 0)
    .map((offer) => {
      const farmer = db.users.find((u) => u.id === offer.ownerId);
      return {
        ...offer,
        farmerBusiness: farmer?.businessName || "Kelompok Tani Mitra",
        isDirectFarmer: true,
      };
    });

  if (grainType && grainType !== "ALL") {
    items = items.filter((item) => item.grainType === grainType);
  }

  if (regency && regency !== "Semua") {
    items = items.filter((item) => item.regency === regency);
  }

  if (district && district !== "Semua") {
    items = items.filter((item) => (item.district || item.districtId) === district);
  }

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (item) =>
        item.farmerName?.toLowerCase().includes(q) ||
        item.farmerBusiness?.toLowerCase().includes(q) ||
        (item.district || item.districtId || "").toLowerCase().includes(q) ||
        item.grainType.toLowerCase().includes(q)
    );
  }

  return { data: items };
}
