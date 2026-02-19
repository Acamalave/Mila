import { cn } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

const imageSizes = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export default function Avatar({ src, alt, size = "md", className }: AvatarProps) {
  const initials = alt
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0",
        sizes[size],
        className
      )}
      style={{
        background: "var(--color-accent-subtle)",
        transition: "background 0.3s ease",
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-cover w-full h-full"
        />
      ) : (
        <span
          className="font-semibold text-sm"
          style={{ color: "var(--color-accent)" }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
