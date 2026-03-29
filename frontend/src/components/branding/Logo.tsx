"use client";

import Image from "next/image";
import { useState } from "react";

export type LogoSize = "small" | "medium" | "large";

export interface LogoProps {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
}

const sizeMap: Record<
  LogoSize,
  { width: number; height: number; className: string }
> = {
  small: { width: 80, height: 32, className: "w-20 h-8" },
  medium: { width: 120, height: 48, className: "w-30 h-12" },
  large: { width: 180, height: 72, className: "w-45 h-18" },
};

/**
 * Logo Component
 * 
 * Displays the iTECity logo with responsive sizing and theme awareness.
 * 
 * Features:
 * - Three size variants: small (80x32), medium (120x48), large (180x72)
 * - Responsive behavior: Desktop (≥768px) full size, Tablet (640px-767px) medium, Mobile (<640px) small
 * - Next.js Image optimization for performance
 * - Automatic fallback to text-based logo on image load error
 * - Maintains aspect ratio at all sizes
 * - Works on both light and dark backgrounds
 * - Accessible with descriptive alt text
 * 
 * @param size - Logo size variant (small, medium, large)
 * @param className - Additional CSS classes for customization
 * @param priority - Whether to prioritize loading (for above-the-fold logos)
 */
export function Logo({ size = "medium", className = "", priority = false }: LogoProps) {
  const [imageError, setImageError] = useState(false);
  const sizeConfig = sizeMap[size];

  // Fallback to text-based logo if image fails to load
  if (imageError) {
    return (
      <div
        className={`flex items-center justify-center font-bold text-foreground ${sizeConfig.className} ${className}`}
        role="img"
        aria-label="iTECity Logo"
      >
        <span
          className={`${
            size === "small"
              ? "text-base"
              : size === "medium"
              ? "text-xl"
              : "text-2xl"
          }`}
        >
          iTECity
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeConfig.className} ${className}`}
      role="img"
      aria-label="iTECity Logo"
    >
      <Image
        src="/logo_itecity.png"
        alt="iTECity - Intelligent Technology Education City"
        width={sizeConfig.width}
        height={sizeConfig.height}
        priority={priority}
        className="object-contain w-full h-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
}
