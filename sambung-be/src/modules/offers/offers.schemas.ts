import { z } from "zod";

export const inputSchema = z.object({
  districtId: z.string().min(1, "Pilih kecamatan lokasi panen."),
  grainType: z.enum(["GKP", "GKG"], { message: "Jenis gabah harus GKP atau GKG." }),
  totalVolumeKg: z
    .number({ message: "Volume panen harus berupa angka." })
    .positive("Volume panen harus lebih besar dari 0 kg.")
    .max(999999999999.99, "Volume panen melebihi batas maksimal.")
    .multipleOf(0.01, "Volume maksimal dua angka di belakang koma."),
  askPrice: z
    .number({ message: "Harga jual harus berupa angka bulat." })
    .int("Harga jual harus berupa angka bulat rupiah per kg.")
    .positive("Harga jual harus lebih dari Rp0.")
    .max(2147483647, "Nominal harga melebihi batas maksimal."),
  quality: z
    .number({ message: "Kadar air harus berupa angka." })
    .min(0, "Kadar air minimal 0%.")
    .max(100, "Kadar air maksimal 100%.")
    .nullable(),
  notes: z.string().max(500, "Gabungan lokasi pengambilan dan catatan maksimal 500 karakter.").nullish(),
  availableOn: z.iso.date({ message: "Format tanggal siap angkut tidak valid (YYYY-MM-DD)." }).nullish(),
});

export const versionSchema = z.object({
  version: z.number().int().positive("Versi tawaran tidak valid. Muat ulang halaman lalu coba kembali."),
  referenceVersion: z.string().max(128).optional(),
  redConfirmed: z.boolean().optional(),
});
