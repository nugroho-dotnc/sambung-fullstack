"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="admin-panel bg-[var(--admin-canvas)] text-foreground flex xl:items-center justify-center min-h-screen">
            <div className="w-full max-w-md lg:max-w-lg py-10 sm:py-14 px-4 sm:px-6 space-y-6">
                <div>
                    <Link
                        href="/"
                        className="admin-breadcrumb-link min-h-10 px-2 -ml-2 gap-1.5 rounded-lg text-sm font-medium text-muted-foreground cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                        <span>Kembali ke Beranda</span>
                    </Link>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    )
}