import Image from "next/image";

interface LogoProps {
  variant?: "dark" | "white";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { width: 120, height: 30, className: "h-6 w-auto" },
  md: { width: 180, height: 45, className: "h-10 w-auto" },
  lg: { width: 240, height: 60, className: "h-14 w-auto" },
  xl: { width: 320, height: 80, className: "h-20 w-auto" },
};

export default function Logo({ variant = "dark", size = "md", className = "" }: LogoProps) {
  const src = variant === "white" ? "/stretch-nyc-logo-white.png" : "/stretch-nyc-logo.png";
  const s = sizes[size];

  return (
    <Image
      src={src}
      alt="Stretch NYC — NYC Mobile Stretch Service | $99/hr"
      width={s.width}
      height={s.height}
      className={`${s.className} ${className}`}
    />
  );
}
