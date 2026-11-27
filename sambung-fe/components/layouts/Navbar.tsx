"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
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
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: user } = useCurrentUser();
  const workspaceHref = user ? getDashboardRoute(user.role) : "/masuk";
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Spacer untuk halaman selain beranda agar konten tidak tertutup navbar fixed */}
      {!isHome && <div className="h-20 sm:h-24 w-full" aria-hidden="true" />}

      <header
        className={`fixed top-0 inset-x-0 z-50 flex justify-center pointer-events-none transition-all duration-300 ease-in-out ${
          isScrolled ? "pt-0 px-0" : "pt-3 sm:pt-4 px-3 sm:px-6"
        }`}
      >
        <div
          className={`pointer-events-auto w-full transition-all duration-300 ease-in-out flex items-center justify-between ${
            isScrolled
              ? "max-w-full rounded-none bg-background/95 dark:bg-background/90 backdrop-blur-md border-b border-border/80 shadow-xs px-4 sm:px-6 lg:px-18 h-16"
              : "max-w-6xl rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-white/50 dark:border-zinc-800/80 shadow-lg shadow-black/5 px-4 sm:px-6 h-14 sm:h-16"
          }`}
        >
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Brand / Logo dengan tagline */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Navigation Drawer */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger
                  className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 md:hidden cursor-pointer"
                  aria-label="Buka menu navigasi"
                >
                  <Menu className="w-5 h-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-6 flex flex-col justify-between">
                  <div className="space-y-6">
                    <SheetHeader className="text-left">
                      <SheetTitle className="flex items-center gap-2.5">
                        <BrandLogo size={32} className="w-8 h-8 rounded-lg" />
                        <div className="flex flex-col text-left">
                          <span className="font-display font-extrabold text-base tracking-tight text-foreground leading-none">
                            SAMBUNG
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium leading-tight">
                            Ekosistem Gabah Digital
                          </span>
                        </div>
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

              <Link href="/" className="flex items-center gap-2.5 group">
                <BrandLogo
                  size={32}
                  className="w-8 h-8 rounded-lg transition-transform group-hover:scale-105"
                />
                <div className="flex flex-col text-left">
                  <span className="font-display font-extrabold text-sm sm:text-base tracking-tight text-foreground leading-none">
                    SAMBUNG
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium tracking-tight leading-tight hidden xs:inline-block">
                    Ekosistem Gabah Digital
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Nav links dengan titik pemisah • */}
            <nav
              aria-label="Navigasi publik"
              className="hidden md:flex items-center gap-2.5 text-xs font-semibold text-foreground/80"
            >
              {NAV_LINKS.map((link, idx) => {
                const isActive = isLinkActive(link.href);
                return (
                  <span key={link.href} className="inline-flex items-center gap-2.5">
                    <Link
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`transition-colors py-1 px-1.5 rounded-md ${
                        isActive
                          ? "text-primary font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                    {idx < NAV_LINKS.length - 1 && (
                      <span className="text-muted-foreground/40 text-[10px] select-none" aria-hidden="true">
                        •
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>

            {/* Right: High-contrast capsule CTA button matching design reference */}
            <div className="flex items-center gap-2">
              <Link
                href={workspaceHref}
                className="group inline-flex items-center gap-2.5 pl-4 pr-1.5 py-1.5 rounded-full bg-brand-forest text-white dark:bg-white dark:text-brand-forest text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <span>
                  {user
                    ? isMobile
                      ? "Ruang Kerja"
                      : "Buka Ruang Kerja"
                    : isMobile
                    ? "Masuk"
                    : "Mulai Bertransaksi"}
                </span>
                <div className="w-6 h-6 rounded-full bg-white text-brand-forest dark:bg-brand-forest-light dark:text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shadow-2xs">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Terang-Gelap di Kanan Bawah untuk Desktop */}
      <div className="fixed bottom-6 right-6 z-50 hidden md:block shadow-lg rounded-xl">
        <ThemeToggle />
      </div>
    </>
  );
}
