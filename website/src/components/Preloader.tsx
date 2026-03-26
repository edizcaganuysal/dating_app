"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

interface PreloaderProps {
  progress: number;
  firstFrameLoaded: boolean;
  onComplete: () => void;
}

const TEASERS = [
  "Dating reimagined",
  "Your group awaits",
  "No more swiping",
  "Real connections",
  "Are you ready?",
];

export default function Preloader({ progress, firstFrameLoaded, onComplete }: PreloaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const teaserRef = useRef<HTMLParagraphElement>(null);
  const revealTextRef = useRef<HTMLDivElement>(null);
  const lineLeftRef = useRef<HTMLDivElement>(null);
  const lineRightRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLParagraphElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  const [currentCount, setCurrentCount] = useState(5);
  const [countdownDone, setCountdownDone] = useState(false);
  const [readyToReveal, setReadyToReveal] = useState(false);
  const exitingRef = useRef(false);

  // Countdown sequence
  useEffect(() => {
    const tl = gsap.timeline();

    // Initial brand entrance
    tl.fromTo(brandRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }
    );

    // Pulse ring entrance
    tl.fromTo(pulseRef.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.4)" },
      "-=0.2"
    );

    // Lines spread
    tl.fromTo(lineLeftRef.current,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.5, ease: "power2.out" },
      "-=0.2"
    );
    tl.fromTo(lineRightRef.current,
      { scaleX: 0 },
      { scaleX: 1, duration: 0.5, ease: "power2.out" },
      "<"
    );

    // Count down 5 → 1
    for (let i = 5; i >= 1; i--) {
      const delay = i === 5 ? "+=0.3" : "+=0.15";

      tl.call(() => setCurrentCount(i), [], delay);

      // Number slam in
      tl.fromTo(countRef.current,
        { scale: 2.5, opacity: 0, rotateX: -30 },
        {
          scale: 1, opacity: 1, rotateX: 0,
          duration: 0.35, ease: "power4.out",
        }
      );

      // Teaser text for this number
      tl.fromTo(teaserRef.current,
        { opacity: 0, y: 15 },
        { opacity: 0.5, y: 0, duration: 0.3, ease: "power2.out" },
        "-=0.15"
      );

      // Pulse ring burst on each count
      tl.fromTo(pulseRef.current,
        { scale: 1, opacity: 0.3 },
        { scale: 2.5, opacity: 0, duration: 0.6, ease: "power2.out" },
        "-=0.35"
      );

      // Hold
      tl.to({}, { duration: 0.25 });

      // Fade out number + teaser (except on 1)
      if (i > 1) {
        tl.to(countRef.current, {
          opacity: 0, scale: 0.8,
          duration: 0.2, ease: "power2.in",
        });
        tl.to(teaserRef.current, {
          opacity: 0, y: -10,
          duration: 0.15, ease: "power2.in",
        }, "<");
      }
    }

    // After "1" — dramatic pause then exit the number
    tl.to({}, { duration: 0.5 });

    tl.to([countRef.current, teaserRef.current, brandRef.current], {
      opacity: 0, y: -40, scale: 0.9,
      duration: 0.4, ease: "power3.in", stagger: 0.05,
    });

    tl.to([lineLeftRef.current, lineRightRef.current], {
      scaleX: 0, duration: 0.3, ease: "power2.in",
    }, "-=0.2");

    // Reveal text "discover yuni"
    tl.call(() => setCountdownDone(true));

    tl.fromTo(revealTextRef.current,
      { opacity: 0, scale: 0.85, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "power3.out" }
    );

    // Hold the reveal text
    tl.to({}, { duration: 0.8 });

    // Mark ready
    tl.call(() => setReadyToReveal(true));

    return () => { tl.kill(); };
  }, []);

  // Exit when countdown is done AND frames are loaded
  const doExit = useCallback(() => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    const tl = gsap.timeline({ onComplete: () => onComplete() });

    // Fade reveal text
    tl.to(revealTextRef.current, {
      opacity: 0, scale: 1.1,
      duration: 0.4, ease: "power2.in",
    });

    // Split-wipe the container
    tl.to(containerRef.current, {
      clipPath: "inset(50% 0 50% 0)",
      duration: 0.9,
      ease: "power4.inOut",
    }, "-=0.1");
  }, [onComplete]);

  useEffect(() => {
    if (readyToReveal && progress >= 1 && firstFrameLoaded) {
      doExit();
    }
  }, [readyToReveal, progress, firstFrameLoaded, doExit]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
      style={{ clipPath: "inset(0 0 0 0)", perspective: "800px" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(255,77,109,0.04) 0%, transparent 60%)",
        }}
      />

      {/* Decorative lines */}
      <div className="absolute top-1/2 left-0 right-1/2 h-[1px] -translate-y-1/2 flex items-center justify-end pointer-events-none">
        <div
          ref={lineLeftRef}
          className="w-[30vw] h-[1px] bg-gradient-to-l from-white/15 to-transparent origin-right"
          style={{ marginRight: "80px" }}
        />
      </div>
      <div className="absolute top-1/2 right-0 left-1/2 h-[1px] -translate-y-1/2 flex items-center justify-start pointer-events-none">
        <div
          ref={lineRightRef}
          className="w-[30vw] h-[1px] bg-gradient-to-r from-white/15 to-transparent origin-left"
          style={{ marginLeft: "80px" }}
        />
      </div>

      {/* Pulse ring */}
      <div
        ref={pulseRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-accent/20 pointer-events-none"
        style={{ opacity: 0 }}
      />

      {/* Brand */}
      <p
        ref={brandRef}
        className="font-display text-[10px] tracking-[0.5em] text-white/25 uppercase mb-16 opacity-0"
      >
        Yuni
      </p>

      {/* Countdown number */}
      {!countdownDone && (
        <div className="relative">
          <div
            ref={countRef}
            className="font-display text-[10rem] md:text-[14rem] font-extralight leading-none text-white/90 opacity-0"
            style={{
              textShadow: "0 0 80px rgba(255,77,109,0.15), 0 0 160px rgba(255,77,109,0.05)",
              transformStyle: "preserve-3d",
            }}
          >
            {currentCount}
          </div>
        </div>
      )}

      {/* Teaser text */}
      {!countdownDone && (
        <p
          ref={teaserRef}
          className="mt-6 text-[10px] md:text-xs tracking-[0.35em] text-white/40 uppercase font-body opacity-0"
        >
          {TEASERS[5 - currentCount]}
        </p>
      )}

      {/* Reveal text */}
      {countdownDone && (
        <div ref={revealTextRef} className="text-center opacity-0">
          <p className="text-[9px] tracking-[0.5em] text-accent/50 uppercase mb-6 font-body">
            The wait is over
          </p>
          <h2
            className="font-display text-5xl md:text-7xl font-extralight tracking-cinematic text-white/90 leading-tight"
            style={{ textShadow: "0 0 60px rgba(255,77,109,0.1)" }}
          >
            Discover Yuni
          </h2>
          <div className="mt-8 flex items-center justify-center gap-3">
            <div className="w-8 h-[1px] bg-white/10" />
            <p className="text-[9px] tracking-[0.4em] text-white/20 uppercase font-body">
              Scroll to explore
            </p>
            <div className="w-8 h-[1px] bg-white/10" />
          </div>
        </div>
      )}

      {/* Bottom loading indicator — only while frames still loading */}
      {!readyToReveal && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
          <div className="w-24 h-[1px] bg-white/[0.06] overflow-hidden rounded-full">
            <div
              className="h-full bg-white/20 transition-all duration-500 ease-out"
              style={{ width: `${Math.floor(progress * 100)}%` }}
            />
          </div>
          <p className="text-[8px] tracking-[0.3em] text-white/10 uppercase font-body">
            {Math.floor(progress * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}
