"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex xl:items-center justify-center min-h-screen">
            <div className="w-full max-w-md lg:max-w-2xl xl:max-w-4xl py-8 sm:py-12 px-4 space-y-8">
                <div>
                    <Link href="/" className="hover:text-foreground cursor-pointer flex items-center gap-2">
                        <ChevronLeft/> Kembali ke Beranda
                    </Link>
                </div>
                <div>
                    {children}
                </div>
            </div>
        </div>
    )
}