import { Button } from "@/components/ui/button";
import { AuthAwareLinkButton } from "@/features/auth/components/auth-aware-link-button";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
    return (
        <section className="relative min-h-[calc(100vh-4rem)] min-h-[580px] flex items-center overflow-hidden">
            {/* Background Image Placeholder */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/asset/image/hero-image.webp"
                    alt="Lahan Pertanian"
                    fill
                    priority
                    unoptimized
                    className="object-cover object-top sm:object-right md:object-center"
                />
                {/* Color overlay that fades to transparent from bottom to top on mobile, and from left to right on desktop
                <div
                    className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-background via-background/90 to-transparent"
                    aria-hidden="true"
                /> */}
            </div>

            <div className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-20 text-center sm:text-left space-y-6">
                <div className="space-y-2">
                    <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto sm:mx-0 leading-[1.15]">
                        Harga Jelas,{" "}
                    </h1>
                    <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto sm:mx-0 leading-[1.15]">
                        Panen Tersambung
                    </h1>
                </div>

                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto sm:mx-0 leading-relaxed">
                    Platform transaksi digital yang mempertemukan Kelompok Tani dengan Pabrik Penggilingan melalui
                    acuan rentang harga wajar dan komitmen pasokan digital bebas komisi.
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                    <AuthAwareLinkButton
                        size="lg"
                        className="min-h-12 px-6 text-base font-semibold shadow-md cursor-pointer"
                        guestHref="/masuk"
                        guestLabel="Masuk / Mulai Bertransaksi"
                        authenticatedLabel="Buka Ruang Kerja"
                        trailingIcon={<ArrowRight className="w-4 h-4 ml-2" />}
                    />

                    <Button
                        variant="outline"
                        size="lg"
                        className="min-h-12 px-6 text-base font-medium cursor-pointer bg-background/60 backdrop-blur-xs "
                        render={<Link href="/peta-harga" />}
                    >
                        Jelajahi Peta & Papan Harga
                    </Button>
                </div>
            </div>
        </section>
    );
}
