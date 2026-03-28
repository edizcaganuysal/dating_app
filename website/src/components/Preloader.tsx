"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

interface PreloaderProps {
  onComplete: () => void;
}

const TEASERS = [
  "No more swiping",
  "Real group dates",
  "Your campus, your people",
  "Ready?",
];

export default function Preloader({ onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentCount, setCurrentCount] = useState(4);
  const [phase, setPhase] = useState<"counting" | "reveal" | "exit">("counting");
  const [numberVisible, setNumberVisible] = useState(true);
  const exitingRef = useRef(false);

  // Countdown: 4 → 1, each number visible for ~700ms
  useEffect(() => {
    if (phase !== "counting") return;

    const interval = setInterval(() => {
      setNumberVisible(false);

      setTimeout(() => {
        setCurrentCount((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPhase("reveal");
            return prev;
          }
          setNumberVisible(true);
          return prev - 1;
        });
      }, 150);
    }, 750);

    return () => clearInterval(interval);
  }, [phase]);

  // Reveal phase: show logo briefly then exit
  useEffect(() => {
    if (phase !== "reveal") return;
    const timer = setTimeout(() => setPhase("exit"), 1200);
    return () => clearTimeout(timer);
  }, [phase]);

  // Exit animation
  const doExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    const el = containerRef.current;
    if (!el) { onComplete(); return; }

    el.style.transition = "clip-path 0.7s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.5s ease";
    el.style.clipPath = "inset(50% 0 50% 0)";
    el.style.opacity = "0";

    setTimeout(onComplete, 750);
  }, [onComplete]);

  useEffect(() => {
    if (phase === "exit") doExit();
  }, [phase, doExit]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-cream flex flex-col items-center justify-center overflow-hidden"
      style={{ clipPath: "inset(0 0 0 0)" }}
    >
      {/* Subtle warm glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(196,0,24,0.04) 0%, transparent 60%)",
        }}
      />

      {/* Countdown number */}
      {phase === "counting" && (
        <div className="relative flex flex-col items-center">
          <div
            className={`font-display text-[8rem] md:text-[12rem] font-bold leading-none text-accent transition-all duration-200 ${
              numberVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
            }`}
          >
            {currentCount}
          </div>

          {/* Teaser text */}
          <p
            className={`mt-4 text-xs md:text-sm tracking-[0.25em] text-muted uppercase font-display transition-opacity duration-200 ${
              numberVisible ? "opacity-60" : "opacity-0"
            }`}
          >
            {TEASERS[4 - currentCount]}
          </p>
        </div>
      )}

      {/* Reveal: logo */}
      {phase === "reveal" && (
        <div className="flex flex-col items-center animate-fade-up">
          <Image
            src="/logo.png"
            alt="Yuni"
            width={200}
            height={90}
            className="h-20 md:h-28 w-auto object-contain mb-6"
            priority
          />
          <p className="text-xs tracking-[0.3em] text-muted/60 uppercase font-display">
            The group dating app
          </p>
        </div>
      )}

      {/* Bottom progress dots */}
      {phase === "counting" && (
        <div className="absolute bottom-12 flex items-center gap-2">
          {[4, 3, 2, 1].map((n) => (
            <div
              key={n}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentCount <= n ? "bg-accent/20" : "bg-accent"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
