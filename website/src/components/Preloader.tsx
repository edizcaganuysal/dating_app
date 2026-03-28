"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

interface PreloaderProps {
  onComplete: () => void;
}

const TEASERS = [
  "No more swiping",
  "Real group dates",
  "Are you ready?",
];

export default function Preloader({ onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentCount, setCurrentCount] = useState(3);
  const [phase, setPhase] = useState<"intro" | "counting" | "reveal" | "exit">("intro");
  const [numberAnim, setNumberAnim] = useState<"enter" | "idle" | "exit">("enter");
  const exitingRef = useRef(false);

  // Intro: brief pause before countdown starts
  useEffect(() => {
    const timer = setTimeout(() => setPhase("counting"), 600);
    return () => clearTimeout(timer);
  }, []);

  // Countdown: 3 → 1, each number has enter/idle/exit cycle
  useEffect(() => {
    if (phase !== "counting") return;

    setNumberAnim("enter");
    const idleTimer = setTimeout(() => setNumberAnim("idle"), 400);
    const exitTimer = setTimeout(() => setNumberAnim("exit"), 1100);
    const nextTimer = setTimeout(() => {
      if (currentCount <= 1) {
        setPhase("reveal");
      } else {
        setCurrentCount((prev) => prev - 1);
        setNumberAnim("enter");
      }
    }, 1400);

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(exitTimer);
      clearTimeout(nextTimer);
    };
  }, [phase, currentCount]);

  // Reveal phase: show logo then exit
  useEffect(() => {
    if (phase !== "reveal") return;
    const timer = setTimeout(() => setPhase("exit"), 1600);
    return () => clearTimeout(timer);
  }, [phase]);

  // Exit animation
  const doExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    const el = containerRef.current;
    if (!el) { onComplete(); return; }

    el.style.transition = "clip-path 0.9s cubic-bezier(0.76, 0, 0.24, 1)";
    el.style.clipPath = "inset(0 0 100% 0)";

    setTimeout(onComplete, 950);
  }, [onComplete]);

  useEffect(() => {
    if (phase === "exit") doExit();
  }, [phase, doExit]);

  const numberAnimClass = {
    enter: "opacity-0 scale-[2] blur-sm",
    idle: "opacity-100 scale-100 blur-0",
    exit: "opacity-0 scale-75 blur-sm -translate-y-8",
  }[numberAnim];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-cream flex flex-col items-center justify-center overflow-hidden"
      style={{ clipPath: "inset(0 0 0 0)" }}
    >
      {/* Warm radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(196,0,24,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Decorative lines */}
      <div className={`absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 pointer-events-none transition-opacity duration-700 ${phase === "counting" ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute left-[10%] right-[55%] h-px bg-gradient-to-l from-accent/15 to-transparent" />
        <div className="absolute right-[10%] left-[55%] h-px bg-gradient-to-r from-accent/15 to-transparent" />
      </div>

      {/* Countdown number */}
      {phase === "counting" && (
        <div className="relative flex flex-col items-center">
          <div
            className={`font-display text-[9rem] md:text-[14rem] font-bold leading-none text-accent transition-all ease-out ${numberAnimClass}`}
            style={{ transitionDuration: numberAnim === "enter" ? "500ms" : "350ms" }}
          >
            {currentCount}
          </div>

          {/* Teaser text */}
          <p
            className={`mt-6 text-sm md:text-base tracking-[0.2em] text-muted uppercase font-display transition-all ${
              numberAnim === "idle"
                ? "opacity-60 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
            style={{
              transitionDuration: "400ms",
              transitionDelay: numberAnim === "idle" ? "100ms" : "0ms",
            }}
          >
            {TEASERS[3 - currentCount]}
          </p>
        </div>
      )}

      {/* Reveal: logo with staggered entrance */}
      {phase === "reveal" && (
        <div className="flex flex-col items-center">
          <div className="preloader-logo-enter">
            <Image
              src="/logo.png"
              alt="Yuni Social"
              width={240}
              height={112}
              className="h-20 md:h-28 w-auto object-contain"
              priority
            />
          </div>
          <p className="preloader-tagline-enter mt-6 text-sm tracking-[0.25em] text-muted/50 uppercase font-display">
            The group dating app
          </p>
        </div>
      )}

      {/* Progress indicator */}
      {phase === "counting" && (
        <div className="absolute bottom-12 flex items-center gap-3">
          {[3, 2, 1].map((n) => (
            <div
              key={n}
              className={`rounded-full transition-all duration-500 ${
                currentCount <= n
                  ? "w-2 h-2 bg-accent/15"
                  : "w-2.5 h-2.5 bg-accent"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
