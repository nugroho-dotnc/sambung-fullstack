"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminLogin } from "@/features/auth/hooks/use-auth";
import { useRedirectAuthenticatedUser } from "@/features/auth/hooks/use-redirect-authenticated";
import { resolvePostAuthPath } from "@/features/auth/domain/role-routes";
import { AdminLoginPageSkeleton } from "@/features/auth/components/auth-page-skeletons";
import { IS_DEMO_FE } from "@/lib/config/fe-mode";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { isRedirecting } = useRedirectAuthenticatedUser(redirect);

  const [email, setEmail] = useState(IS_DEMO_FE ? "admin@sambung.id" : "");
  const [password, setPassword] = useState(IS_DEMO_FE ? "admin123" : "");
  const [errorMsg, setErrorMsg] = useState("");

  const adminLoginMutation = useAdminLogin();

  if (isRedirecting) {
    return <AdminLoginPageSkeleton label="Mengalihkan ke panel yang sesuai..." />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Email dan kata sandi pengelola wajib diisi.");
      return;
    }

    try {
      const res = await adminLoginMutation.mutateAsync({ email, password });
      router.replace(resolvePostAuthPath(res.user.role, redirect));
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Kredensial pengelola tidak sesuai. Silakan periksa kembali."
      );
    }
  };

  return (
    <div className="overflow-hidden p-4 sm:p-6 w-full space-y-7">
      <div className="space-y-3 border-b border-border pb-6">
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          <span>Portal Pengawas</span>
        </span>
        <h1 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-foreground leading-tight">
          Portal Pengawas &amp; Tata Kelola
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Akses khusus staf pengawas data harga, kalibrasi parameter pasar, dan audit sistem.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="admin-email" className="text-xs font-semibold text-foreground">
            Alamat Email Resmi
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Mail className="w-4 h-4" aria-hidden="true" />
            </div>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@sambung.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 min-h-11 text-sm tabular-nums rounded-lg"
              disabled={adminLoginMutation.isPending}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password" className="text-xs font-semibold text-foreground">
            Kata Sandi Pengelola
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Lock className="w-4 h-4" aria-hidden="true" />
            </div>
            <Input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 min-h-11 text-sm rounded-lg"
              disabled={adminLoginMutation.isPending}
              required
            />
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="px-4 py-3 rounded-lg status-error text-xs font-medium leading-relaxed"
          >
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-4 pt-2">
          <Button
            type="submit"
            className="w-full min-h-11 rounded-lg font-semibold cursor-pointer"
            disabled={adminLoginMutation.isPending}
          >
            <span>{adminLoginMutation.isPending ? "Mengautentikasi..." : "Masuk ke Panel Pengawasan"}</span>
            <ArrowRight className="cta-arrow w-4 h-4 ml-2" aria-hidden="true" />
          </Button>
          <div className="flex items-center justify-end w-full pt-4 border-t border-border text-xs text-muted-foreground">
            <Link
              href="/masuk"
              className="admin-breadcrumb-link font-semibold text-foreground py-1"
            >
              Masuk Sebagai Petani / Penggiling
            </Link>
          </div>
        </div>

        {IS_DEMO_FE && (
          <div className="border-t border-border pt-4 text-xs space-y-1 text-muted-foreground">
            <p className="font-semibold text-[var(--admin-gold-text)]">Akun Demo Pengawas</p>
            <p className="tabular-nums">Email: admin@sambung.id · Sandi: admin123</p>
          </div>
        )}
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginPageSkeleton />}>
      <AdminLoginContent />
    </Suspense>
  );
}
