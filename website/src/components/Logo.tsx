"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  inverted?: boolean;
  className?: string;
}

const sizes = {
  sm: { yuni: "text-2xl", social: "text-base", gap: "-mt-1.5" },
  md: { yuni: "text-4xl", social: "text-xl", gap: "-mt-2" },
  lg: { yuni: "text-5xl md:text-6xl", social: "text-2xl md:text-3xl", gap: "-mt-2 md:-mt-3" },
  xl: { yuni: "text-7xl md:text-8xl", social: "text-3xl md:text-4xl", gap: "-mt-3 md:-mt-4" },
};

export default function Logo({ size = "md", inverted = false, className = "" }: LogoProps) {
  const s = sizes[size];
  const color = inverted ? "text-cream" : "text-accent";

  return (
    <div className={`inline-flex flex-col items-start leading-none select-none ${className}`}>
      <span className={`font-editorial font-bold tracking-tight ${s.yuni} ${color}`}>
        yuni
      </span>
      <span className={`font-editorial italic font-medium tracking-wide ${s.social} ${s.gap} ${color}`}>
        social
      </span>
    </div>
  );
}
