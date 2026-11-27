"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sprout,
  Building2,
  User,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Check,
  MapPin,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useRegisterProfile } from "@/features/auth/hooks/use-auth";
import { useRedirectAuthenticatedUser } from "@/features/auth/hooks/use-redirect-authenticated";
import { resolvePostAuthPath } from "@/features/auth/domain/role-routes";
import { RegisterPageSkeleton } from "@/features/auth/components/auth-page-skeletons";
import { useMobile } from "@/hooks/use-mobile";

type RegistrationStep = 1 | 2 | 3;

function RegisterContent() {
  const isMobile = useMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const redirect = searchParams.get("redirect");
  const { isRedirecting } = useRedirectAuthenticatedUser(redirect);

  const [step, setStep] = useState<RegistrationStep>(1);
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
    if (!phone && !isRedirecting) {
      router.push("/masuk");
    }
  }, [phone, isRedirecting, router]);

  if (isRedirecting) {
    return <RegisterPageSkeleton label="Mengalihkan ke ruang kerja..." />;
  }

  const steps = [
    { num: 1 as const, label: isMobile ? "Peran" : "Pilih Peran" },
    { num: 2 as const, label: "Identitas" },
    { num: 3 as const, label: "Alamat" },
  ];

  const handleGoToStep = (targetStep: RegistrationStep) => {
    if (targetStep < step) {
      setErrorMsg("");
      setStep(targetStep);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    setStep((prev) => (prev === 3 ? 2 : 1));
  };

  const validateStep2 = (): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Nama lengkap penanggung jawab wajib diisi.");
      return false;
    }
    if (trimmedName.length < 2) {
      setErrorMsg("Nama lengkap minimal 2 karakter.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      return;
    }

    if (!validateStep2()) {
      setStep(2);
      return;
    }

    if (!province.trim()) {
      setErrorMsg("Provinsi domisili usaha/lahan wajib diisi.");
      return;
    }
    if (!regency.trim()) {
      setErrorMsg("Kabupaten / Kota domisili usaha/lahan wajib diisi.");
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
        province: province.trim(),
        regency: regency.trim(),
        district: district.trim(),
        businessName: businessName.trim() || undefined,
        agreedToTerms: true,
      });

      router.replace(resolvePostAuthPath(res.user.role, redirect));
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Pendaftaran gagal diproses. Silakan lengkapi data Anda."
      );
    }
  };

  const roleLabel = role === "petani" ? "Petani / Kelompok Tani" : "Produsen / Penggilingan";

  return (
    <div className="w-full space-y-6">
      {/* Header & Step Pill (Referensi: OfferWizard) */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Selamat datang di Sambung!
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Nomor <span className="font-semibold text-foreground tabular-nums">{phone}</span> belum terdaftar.{" "}
            {step === 1 && "Pilih peran akun untuk menentukan ruang kerja Anda di SAMBUNG."}
            {step === 2 && "Lengkapi identitas penanggung jawab serta nama kelompok tani atau tempat usaha."}
            {step === 3 && "Lengkapi alamat domisili usaha/lahan dan setujui ketentuan layanan."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start shrink-0 rounded-full border border-border/80 bg-muted/40 px-3.5 py-1 text-xs font-medium text-muted-foreground">
          <span>Tahap</span>
          <strong className="text-foreground tabular-nums">{step}</strong>
          <span>dari 3</span>
        </div>
      </div>

      {/* Stepper Wizard Bar */}
      <nav aria-label="Tahapan Pendaftaran" className="grid grid-cols-3 gap-1.5 sm:gap-4">
        {steps.map((item) => {
          const isActive = step === item.num;
          const isDone = step > item.num;
          const containerClass = `flex w-full items-center gap-1.5 sm:gap-2.5 rounded-xl border p-2 sm:p-3 text-xs font-medium text-left transition ${
            isActive
              ? "border-primary bg-primary/10 text-primary shadow-xs"
              : isDone
              ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer"
              : "border-border/80 bg-card text-foreground"
          }`;

          const badgeClass = `flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isActive
              ? "bg-primary text-primary-foreground shadow-xs"
              : isDone
              ? "bg-primary/15 text-primary"
              : "bg-muted text-foreground border border-border/80"
          }`;

          const content = (
            <>
              <span className={badgeClass}>
                {isDone ? <Check className="size-3.5 stroke-[2.5]" aria-hidden="true" /> : item.num}
              </span>
              <span className="truncate font-semibold">{item.label}</span>
            </>
          );

          if (isDone) {
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => handleGoToStep(item.num)}
                disabled={registerMutation.isPending}
                className={containerClass}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={item.num}
              aria-current={isActive ? "step" : undefined}
              className={containerClass}
            >
              {content}
            </div>
          );
        })}
      </nav>

      {/* Error Banner */}
      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-xs sm:text-sm text-destructive leading-relaxed"
        >
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={registerMutation.isPending} className="space-y-6">
          {/* Tahap 1: Memilih Peran */}
          {step === 1 && (
            <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 flex flex-col gap-6">
              <div className="border-b border-border/60 pb-3">
                <h2 className="text-base font-semibold text-foreground">
                  1. Pilih Peran Akun Anda
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Peran ini bersifat permanen untuk menjamin transparansi dan keamanan kesepakatan pasokan gabah.
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Pilih Peran Akun Anda"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={role === "petani"}
                  onClick={() => {
                    setRole("petani");
                    if (errorMsg) setErrorMsg("");
                  }}
                  className={`flex h-full cursor-pointer flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                    role === "petani"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border bg-background hover:border-border/80 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Sprout className="h-5 w-5" />
                    </div>
                    {role === "petani" && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
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
                  role="radio"
                  aria-checked={role === "pembeli"}
                  onClick={() => {
                    setRole("pembeli");
                    if (errorMsg) setErrorMsg("");
                  }}
                  className={`flex h-full cursor-pointer flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                    role === "pembeli"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border bg-background hover:border-border/80 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                    {role === "pembeli" && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Produsen / Penggilingan</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Mencari pasokan gabah berkualitas di katalog dan mengajukan pesanan kesepakatan langsung.
                    </p>
                  </div>
                </button>
              </div>
            </section>
          )}

          {/* Tahap 2: Mengisi Identitas */}
          {step === 2 && (
            <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 flex flex-col gap-6">
              <div className="border-b border-border/60 pb-3">
                <h2 className="text-base font-semibold text-foreground">
                  2. Identitas Penanggung Jawab &amp; Usaha
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Lengkapi nama penanggung jawab serta nama kelompok tani (poktan) atau tempat usaha Anda.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="block text-xs font-medium text-foreground">
                    Nama Lengkap Penanggung Jawab <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <Input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Contoh: Budi Santoso"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errorMsg) setErrorMsg("");
                      }}
                      className="h-11 rounded-xl border-input bg-background pl-10 text-sm focus-visible:ring-primary"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="businessName" className="block text-xs font-medium text-foreground">
                    {role === "petani"
                      ? "Nama Kelompok Tani / Poktan (Opsional)"
                      : "Nama Tempat Usaha / Penggilingan (Opsional)"}
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <Input
                      id="businessName"
                      type="text"
                      autoComplete="organization"
                      placeholder={
                        role === "petani"
                          ? "Contoh: Poktan Subur Makmur"
                          : "Contoh: UD Tani Jaya / PB Berkah Padi"
                      }
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="h-11 rounded-xl border-input bg-background pl-10 text-sm focus-visible:ring-primary"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Kosongkan apabila Anda mendaftar atas nama perorangan.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Tahap 3: Alamat & Persetujuan */}
          {step === 3 && (
            <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-7 flex flex-col gap-6">
              <div className="border-b border-border/60 pb-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  3. Alamat Domisili &amp; Persetujuan
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {role === "petani"
                    ? "Tentukan wilayah domisili lahan atau lokasi usaha tani Anda."
                    : "Tentukan wilayah domisili penggilingan atau tempat usaha Anda."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label htmlFor="province" className="block text-xs font-medium text-foreground">
                    Provinsi <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="province"
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="Contoh: Jawa Barat"
                    className="h-11 rounded-xl border-input bg-background px-3 text-sm focus-visible:ring-primary"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="regency" className="block text-xs font-medium text-foreground">
                    Kabupaten / Kota <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="regency"
                    value={regency}
                    onChange={(e) => {
                      setRegency(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="Contoh: Subang"
                    className="h-11 rounded-xl border-input bg-background px-3 text-sm focus-visible:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                  <label htmlFor="district" className="block text-xs font-medium text-foreground">
                    Kecamatan <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="district"
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder="Contoh: Pagaden"
                    className="h-11 rounded-xl border-input bg-background px-3 text-sm focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Checkbox Persetujuan Syarat & Privasi (FR-002.13: Tidak boleh tercentang bawaan) */}
              <div className="pt-4 border-t border-border/60">
                <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 sm:p-4">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => {
                      setAgreedToTerms(checked === true);
                      if (errorMsg) setErrorMsg("");
                    }}
                    className="mt-0.5 shrink-0"
                  />
                  <label
                    htmlFor="terms"
                    className="block cursor-pointer text-xs font-normal leading-relaxed text-muted-foreground sm:text-sm"
                  >
                    Saya menyatakan bahwa data yang diisikan benar dan menyetujui{" "}
                    <Link
                      href="/bantuan"
                      target="_blank"
                      className="font-medium text-primary hover:underline"
                    >
                      Ketentuan Layanan &amp; Kebijakan Data SAMBUNG
                    </Link>
                    . Saya memahami bahwa kesepakatan pasokan gabah bersifat mengikat komitmen harga dan volume secara digital.
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* Form Actions Footer (Referensi: OfferWizard) */}
          <footer className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto text-left">
              <p className="text-xs font-semibold text-foreground">
                {step === 1 && "Tahap 1: Pemilihan Peran"}
                {step === 2 && `Tahap 2: Identitas (${roleLabel})`}
                {step === 3 && `Tahap 3: Alamat (${name.trim() || roleLabel})`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 1 && "Klik lanjut setelah menentukan peran akun yang sesuai."}
                {step === 2 && "Pastikan nama lengkap penanggung jawab terisi dengan benar."}
                {step === 3 && "Periksa alamat domisili dan centang persetujuan untuk masuk."}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              {step === 1 ? (
                <ButtonLink
                  variant="outline"
                  className="flex-1 sm:flex-none min-h-11 px-4 rounded-xl"
                  title="Batal & gunakan nomor lain"
                  aria-label="Batal & gunakan nomor lain"
                  href="/masuk"
                >
                  Batal
                </ButtonLink>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none min-h-11 px-4 rounded-xl"
                  onClick={handlePrevStep}
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Sebelumnya
                </Button>
              )}

              <Button
                type="submit"
                className="flex-1 sm:flex-none min-h-11 px-5 rounded-xl font-semibold"
                disabled={registerMutation.isPending || (step === 3 && !agreedToTerms)}
              >
                {step === 1 && (
                  <>
                    {isMobile ? "Lanjut" : "Lanjut ke Identitas"}
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
                {step === 2 && (
                  <>
                    {isMobile ? "Lanjut" : "Lanjut ke Alamat"}
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
                {step === 3 && (
                  <>
                    {registerMutation.isPending
                      ? "Mendaftarkan Akun..."
                      : isMobile
                      ? "Daftar & Masuk"
                      : "Selesaikan Pendaftaran"}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </footer>
        </fieldset>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageSkeleton />}>
      <RegisterContent />
    </Suspense>
  );
}
