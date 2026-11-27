import Image from "next/image";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  /** Ukuran render logo dalam piksel (lebar dan tinggi). Default 32px. */
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * Logo merek SAMBUNG menggunakan `next/image` dari `/asset/image/logo.png`.
 */
export function BrandLogo({
  size = 32,
  className,
  alt = "",
}: BrandLogoProps) {
  return (
    <Image
      src="/asset/image/logo.png"
      alt={alt}
      width={size}
      height={size}
      loading="eager"
      unoptimized
      className={cn("shrink-0 object-contain select-none", className)}
    />
  );
}
