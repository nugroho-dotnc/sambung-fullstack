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
    <div className="w-full space-y-8">
      <div className="space-y-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Portal Pengawas & Tata Kelola
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Akses khusus staf pengawas data harga, kalibrasi parameter pasar, dan audit sistem.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="admin-email" className="text-xs font-semibold">
            Alamat Email Resmi
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Mail className="w-4 h-4" />
            </div>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@sambung.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 min-h-11 text-sm tabular-nums"
              disabled={adminLoginMutation.isPending}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password" className="text-xs font-semibold">
            Kata Sandi Pengelola
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              id="admin-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 min-h-11 text-sm"
              disabled={adminLoginMutation.isPending}
              required
            />
          </div>
        </div>

        {errorMsg && (
          <div className="px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-5 pt-2">
          <Button
            type="submit"
            className="w-full min-h-11 font-semibold"
            disabled={adminLoginMutation.isPending}
          >
            {adminLoginMutation.isPending ? "Mengautentikasi..." : "Masuk ke Panel Pengawasan"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <div className="flex items-center justify-end w-full pt-4 border-t border-border/60 text-xs text-muted-foreground">
              <Link href="/masuk" className="font-medium text-foreground hover:underline flex items-center gap-1">
                Masuk Sebagai Petani / Penggiling
              </Link>
          </div>
        </div>

        {IS_DEMO_FE && (
          <div className="pt-3">
            <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-4 text-xs space-y-1.5">
              <p className="font-semibold text-foreground">Akun Demo Pengawas:</p>
              <p className="text-muted-foreground text-xs">Email: admin@sambung.id</p>
              <p className="text-muted-foreground tabular-nums text-xs">Sandi: admin123</p>
            </div>
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
