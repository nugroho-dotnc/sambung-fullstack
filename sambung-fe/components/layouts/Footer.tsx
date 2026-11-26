"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on full-page map route
  if (pathname?.startsWith("/peta-harga")) {
    return null;
  }

  return (
    <footer className="border-t border-border/80 bg-card py-8 text-xs text-muted-foreground mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs">
              <Sprout className="w-3.5 h-3.5" />
            </div>
            <p className="font-bold text-foreground text-sm">
              SAMBUNG
            </p>
          </div>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            Sistem Agrikultur Modern Berbasis Unggulan Nilai Gabah. Mendorong transparansi rantai pasok dan memperkuat posisi tawar petani Indonesia.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <Link href="/" className="hover:text-foreground hover:underline">
            Beranda
          </Link>
          <span>·</span>
          <Link href="/peta-harga" className="hover:text-foreground hover:underline">
            Peta & Papan Harga
          </Link>
          <span>·</span>
          <Link href="/bantuan" className="hover:text-foreground hover:underline">
            Bantuan
          </Link>
          <span>·</span>
          <Link href="/admin/masuk" className="hover:text-foreground hover:underline text-muted-foreground/70">
            Akses Pengawas
          </Link>
        </div>
      </div>
    </footer>
  );
}
