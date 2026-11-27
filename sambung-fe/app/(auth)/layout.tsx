"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Sprout } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full dark:bg-background p-3 sm:p-5 lg:p-6 flex items-center justify-center">
      <div className="w-full min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[min(calc(100vh-3rem),820px)] p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel Kiri: Visual Hero Lahan Padi (50% lebar pada desktop) */}
        <div className="hidden lg:flex relative h-full min-h-[560px] rounded-2xl overflow-hidden bg-zinc-900 select-none flex-col justify-between">
          <Image
            src="/asset/image/hero-image4.webp"
            alt="Petani membawa hasil panen padi di lahan terasering"
            fill
            priority
            unoptimized
            className="object-cover object-[68%_center]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/25"
          />

          <div className="relative z-10 p-5 flex items-start justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full bg-black/35 hover:bg-black/50 backdrop-blur-md border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center px-3 py-6 sm:px-8 sm:py-10 lg:px-10">
          <div className="lg:hidden max-w-md lg:max-w-max w-full mb-6">
             <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full text-black dark:text-white border-black dark:border-white hover:bg-black/50 dark:hover:bg-white/50 backdrop-blur-md border px-3.5 py-1.5 text-xs font-medium transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Kembali ke Beranda
            </Link>
          </div>

          <div className="w-full max-w-md lg:max-w-max flex flex-col items-center gap-7">
            <div className="w-full">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}