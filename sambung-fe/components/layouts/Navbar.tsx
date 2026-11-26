"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout, LogIn, LayoutDashboard, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useCurrentUser } from "@/features/auth/hooks/use-auth";
import { getDashboardRoute } from "@/features/auth/domain/role-routes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMobile } from "@/hooks/use-mobile";

const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/peta-harga", label: "Peta & Papan Harga" },
  { href: "/bantuan", label: "Bantuan" },
];

export default function PublicNavbar() {
  const isMobile = useMobile();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const workspaceHref = user ? getDashboardRoute(user.role) : "/masuk";

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
      <nav
        aria-label="Navigasi publik"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Mobile Navigation Drawer */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 md:hidden cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-6 flex flex-col justify-between">
              <div className="space-y-6">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                      <Sprout className="w-5 h-5" />
                    </div>
                    <span className="font-display font-extrabold text-base tracking-tight text-foreground">
                      SAMBUNG
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col space-y-1">
                  {NAV_LINKS.map((link) => {
                    const isActive = isLinkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Mode Terang-Gelap di dalam hamburger menu di mobile */}
              <div className="pt-4 border-t border-border/80 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Tema Tampilan
                </span>
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-display font-extrabold text-base tracking-tight text-foreground">
              SAMBUNG
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Tombol Masuk atau akses langsung Ruang Kerja jika sesi masih aktif */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            size="sm"
            nativeButton={false}
            className="min-h-9 px-3 sm:px-4 text-xs font-semibold cursor-pointer"
            render={
              <Link href={workspaceHref}>
                {user ? (
                  <>
                    <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                    {isMobile ? "Ruang Kerja" : "Buka Ruang Kerja"}
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                    {isMobile ? "Masuk" : "Masuk / Daftar"}
                  </>
                )}
              </Link>
            }
          />
        </div>
      </nav>
    </header>

    {/* Mode Terang-Gelap di Kanan Bawah untuk Desktop */}
    <div className="fixed bottom-6 right-6 z-50 hidden md:block shadow-lg rounded-xl">
      <ThemeToggle />
    </div>
  </>
  );
}