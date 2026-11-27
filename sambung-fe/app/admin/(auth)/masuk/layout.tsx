"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex xl:items-center justify-center min-h-screen">
            <div className="w-full max-w-md lg:max-w-2xl py-8 sm:py-12 px-4 space-y-8">
                <div>
                    <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 rounded-full text-black dark:text-white border-black dark:border-white hover:bg-black/50 dark:hover:bg-white/50 backdrop-blur-md border px-3.5 py-1.5 text-xs font-medium transition-colors"
                    >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Kembali ke Beranda
                    </Link>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    )
}