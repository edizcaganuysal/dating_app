"use client";

export default function Marquee() {
  const items = [
    "Group Dating",
    "University Only",
    "AI Matching",
    "Verified Profiles",
    "Safe & Secure",
    "Real Connections",
    "No Swiping",
    "Activity Based",
  ];

  const row = items.map((item, i) => (
    <span key={i} className="flex items-center gap-8 shrink-0">
      <span className="font-display text-sm md:text-base tracking-[0.2em] text-white/30 uppercase whitespace-nowrap">
        {item}
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-accent/50 shrink-0" />
    </span>
  ));

  return (
    <div className="relative py-8 overflow-hidden border-y border-white/[0.03]">
      <div className="flex gap-8 animate-marquee">
        {row}
        {row}
        {row}
      </div>
    </div>
  );
}
