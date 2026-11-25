"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sprout, Building2, User, MapPin, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useRegisterProfile } from "@/features/auth/hooks/use-auth";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";

  const [role, setRole] = useState<"petani" | "pembeli">("petani");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [province, setProvince] = useState("Jawa Barat");
  const [regency, setRegency] = useState("Subang");
  const [district, setDistrict] = useState("Pagaden");
  const [agreedToTerms, setAgreedToTerms] = useState(false); // FR-002.13: TIDAK tercentang otomatis!
  const [errorMsg, setErrorMsg] = useState("");

  const registerMutation = useRegisterProfile();

  useEffect(() => {
    if (!phone) {
      router.push("/masuk");
    }
  }, [phone, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Nama lengkap wajib diisi.");
      return;
    }
    if (!district.trim()) {
      setErrorMsg("Kecamatan domisili usaha/lahan wajib diisi.");
      return;
    }
    if (!agreedToTerms) {
      setErrorMsg("Anda harus membaca dan mencentang persetujuan Ketentuan Layanan untuk melanjutkan.");
      return;
    }

    try {
      const res = await registerMutation.mutateAsync({
        phone,
        role,
        name: name.trim(),
        province,
        regency,
        district: district.trim(),
        businessName: businessName.trim() || undefined,
        agreedToTerms: true,
      });

      if (res.user.role === "petani") {
        router.push("/petani");
      } else {
        router.push("/pembeli");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Pendaftaran gagal diproses. Silakan lengkapi data Anda.");
    }
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Header halaman */}
      <div className="space-y-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Selamat datang di Sambung!
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Nomor Anda <span className="font-semibold text-foreground tabular-nums">{phone}</span> belum terdaftar.
          {" "}Lengkapi identitas untuk menentukan ruang kerja Anda di platform SAMBUNG.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pemilihan Peran (Petani vs Pembeli) */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Pilih Peran Akun Anda</Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Peran ini bersifat permanen untuk menjamin transparansi dan keamanan kesepakatan pasokan gabah.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setRole("petani")}
              className={`flex h-full cursor-pointer flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                role === "petani"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-background hover:border-border/80"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <Sprout className="h-5 w-5" />
                </div>
                {role === "petani" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Petani / Kelompok Tani</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Menawarkan hasil panen gabah, memeriksa batas harga wajar, dan menerima pesanan pabrik.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole("pembeli")}
              className={`flex h-full cursor-pointer flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                role === "pembeli"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-background hover:border-border/80"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <Building2 className="h-5 w-5" />
                </div>
                {role === "pembeli" && <Check className="h-4 w-4 text-primary" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Pembeli / Penggilingan</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Mencari pasokan gabah berkualitas di katalog dan mengajukan pesanan kesepakatan langsung.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Isian Identitas Diri */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-semibold">
              Nama Lengkap Penanggung Jawab
            </Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <User className="h-4 w-4" />
              </div>
              <Input
                id="fullName"
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-11 pl-10 text-base"
                disabled={registerMutation.isPending}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-sm font-semibold leading-snug">
              Nama Kelompok Tani / Usaha Penggilingan (Opsional)
            </Label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </div>
              <Input
                id="businessName"
                type="text"
                placeholder="Contoh: Poktan Subur Makmur / UD Tani Jaya"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="min-h-11 pl-10 text-base"
                disabled={registerMutation.isPending}
              />
            </div>
          </div>

          {/* 1 kolom (mobile) → 2 kolom (sm) → 3 kolom (md) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="province" className="text-sm font-semibold">
                Provinsi
              </Label>
              <Input
                id="province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="min-h-11 text-base"
                disabled={registerMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regency" className="text-sm font-semibold">
                Kabupaten / Kota
              </Label>
              <Input
                id="regency"
                value={regency}
                onChange={(e) => setRegency(e.target.value)}
                className="min-h-11 text-base"
                disabled={registerMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2 md:col-span-1">
              <Label htmlFor="district" className="text-sm font-semibold">
                Kecamatan
              </Label>
              <Input
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="min-h-11 text-base"
                disabled={registerMutation.isPending}
                required
              />
            </div>
          </div>
        </div>

        {/* Checkbox Persetujuan Syarat & Privasi (FR-002.13: Tidak boleh tercentang bawaan) */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 sm:p-4">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              disabled={registerMutation.isPending}
              className="mt-0.5 shrink-0"
            />
            <Label
              htmlFor="terms"
              className="cursor-pointer text-xs font-normal leading-relaxed text-muted-foreground sm:text-sm"
            >
              Saya menyatakan bahwa data yang diisikan benar dan menyetujui{" "}
              <Link href="/bantuan" target="_blank" className="font-medium text-primary hover:underline">
                Ketentuan Layanan & Kebijakan Data SAMBUNG
              </Link>
              . Saya memahami bahwa kesepakatan pasokan gabah bersifat mengikat komitmen harga dan volume secara digital.
            </Label>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="px-3 py-2.5 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs leading-relaxed sm:text-sm"
            >
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full min-h-11 text-base font-semibold"
            disabled={registerMutation.isPending || !agreedToTerms}
          >
            {registerMutation.isPending ? "Mendaftarkan Akun..." : "Selesaikan Pendaftaran & Masuk"}
            <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
          </Button>

          <div className="flex items-center justify-center w-full pt-4 border-t border-border/60 text-xs text-muted-foreground">
            <Link
              href="/masuk"
              className="font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              ← Batal & Gunakan Nomor Lain
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Memuat formulir pendaftaran...</div>}>
      <RegisterContent />
    </Suspense>
  );
}