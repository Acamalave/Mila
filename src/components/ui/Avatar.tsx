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
        "relative rounded-full overflow-hidden bg-mila-gold/20 flex items-center justify-center flex-shrink-0",
        sizes[size],
        className
      )}
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
        <span className="text-mila-gold font-semibold text-sm">{initials}</span>
      )}
    </div>
  );
}
