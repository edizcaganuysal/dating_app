"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import FilmGrain from "@/components/FilmGrain";
import Marquee from "@/components/Marquee";
import WaitlistFlow from "@/components/WaitlistFlow";
import StatsCounter from "@/components/StatsCounter";
import Footer from "@/components/Footer";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 150;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const currentFrameRef = useRef(0);

  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroTaglineRef = useRef<HTMLParagraphElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const waitlistSectionRef = useRef<HTMLDivElement>(null);
  const statsSectionRef = useRef<HTMLDivElement>(null);
  const ctaSectionRef = useRef<HTMLDivElement>(null);

  const [submitted, setSubmitted] = useState(false);
  const [preloaderDone, setPreloaderDone] = useState(false);

  const getFramePath = useCallback(
    (index: number) =>
      `/sequence-1/frame-${String(index + 1).padStart(4, "0")}.jpg`,
    []
  );

  const { images, progress, firstFrameLoaded } = useImagePreloader(
    FRAME_COUNT,
    getFramePath
  );

  // Draw frame
  const drawFrame = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      let frameImg = images.current[index];
      if (!frameImg?.complete) {
        for (let offset = 1; offset < FRAME_COUNT; offset++) {
          const below = images.current[index - offset];
          if (below?.complete) { frameImg = below; break; }
          const above = images.current[index + offset];
          if (above?.complete) { frameImg = above; break; }
        }
      }
      if (!frameImg?.complete) return;

      const scale = Math.max(
        canvas.width / frameImg.naturalWidth,
        canvas.height / frameImg.naturalHeight
      );
      const x = (canvas.width - frameImg.naturalWidth * scale) / 2;
      const y = (canvas.height - frameImg.naturalHeight * scale) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        frameImg, x, y,
        frameImg.naturalWidth * scale,
        frameImg.naturalHeight * scale
      );
    },
    [images]
  );

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      drawFrame(currentFrameRef.current);
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawFrame]);

  // Draw first frame
  useEffect(() => {
    if (firstFrameLoaded) drawFrame(0);
  }, [firstFrameLoaded, drawFrame]);

  // Mouse parallax on hero text
  useEffect(() => {
    if (!preloaderDone) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!heroTextRef.current) return;
      const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
      const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;

      gsap.to(heroTitleRef.current, {
        x: xPercent * -15,
        y: yPercent * -10,
        duration: 1,
        ease: "power3.out",
      });
      gsap.to(heroTaglineRef.current, {
        x: xPercent * -8,
        y: yPercent * -5,
        duration: 1.2,
        ease: "power3.out",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [preloaderDone]);

  // Lenis + GSAP + all scroll animations
  useEffect(() => {
    if (!preloaderDone) return;

    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // FRAME SCRUBBING
    ScrollTrigger.create({
      trigger: mainRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
      onUpdate: (self) => {
        const frameIndex = Math.min(
          Math.floor(self.progress * (FRAME_COUNT - 1)),
          FRAME_COUNT - 1
        );
        if (frameIndex !== currentFrameRef.current) {
          currentFrameRef.current = frameIndex;
          drawFrame(frameIndex);
        }
      },
    });

    // ── HERO TEXT ──
    gsap.fromTo(heroTitleRef.current,
      { opacity: 0, y: 80, scale: 0.92 },
      {
        opacity: 1, y: 0, scale: 1,
        scrollTrigger: { trigger: heroTextRef.current, start: "top 80%", end: "top 30%", scrub: 1 },
      }
    );
    gsap.fromTo(heroTaglineRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0,
        scrollTrigger: { trigger: heroTextRef.current, start: "top 60%", end: "top 20%", scrub: 1 },
      }
    );
    gsap.to([heroTitleRef.current, heroTaglineRef.current], {
      opacity: 0, y: -60,
      scrollTrigger: { trigger: heroTextRef.current, start: "bottom 80%", end: "bottom 30%", scrub: 1 },
    });
    gsap.to(scrollHintRef.current, {
      opacity: 0,
      scrollTrigger: { trigger: mainRef.current, start: "2% top", end: "5% top", scrub: true },
    });

    // ── WAITLIST ──
    const waitlistCard = waitlistSectionRef.current?.querySelector(".waitlist-card");
    if (waitlistCard) {
      gsap.fromTo(waitlistCard,
        { opacity: 0, y: 80, scale: 0.96 },
        {
          opacity: 1, y: 0, scale: 1,
          scrollTrigger: { trigger: waitlistSectionRef.current, start: "top 75%", end: "top 25%", scrub: 1 },
        }
      );
    }

    // ── STATS ──
    const statsInner = statsSectionRef.current?.querySelector(".stats-inner");
    if (statsInner) {
      gsap.fromTo(statsInner,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          scrollTrigger: { trigger: statsSectionRef.current, start: "top 70%", end: "top 40%", scrub: 1 },
        }
      );
    }

    // ── CTA ──
    const ctaInner = ctaSectionRef.current?.querySelector(".cta-inner");
    if (ctaInner) {
      gsap.fromTo(ctaInner,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1, scale: 1,
          scrollTrigger: { trigger: ctaSectionRef.current, start: "top 70%", end: "top 40%", scrub: 1 },
        }
      );
    }

    return () => {
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [drawFrame, preloaderDone]);

  return (
    <>
      {/* ═══ PRELOADER ═══ */}
      {!preloaderDone && (
        <Preloader
          progress={progress}
          firstFrameLoaded={firstFrameLoaded}
          onComplete={() => setPreloaderDone(true)}
        />
      )}


      {/* ═══ NAVBAR ═══ */}
      {preloaderDone && <Navbar />}

      {/* ═══ FILM GRAIN ═══ */}
      <FilmGrain />

      {/* ═══ FIXED BACKGROUND CANVAS ═══ */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0"
        style={{ width: "100vw", height: "100vh" }}
      />

      {/* Vignette */}
      <div className="fixed inset-0 z-[1] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 20%, rgba(5,5,5,0.5) 100%)",
        }}
      />

      {/* ═══ SCROLL CONTENT ═══ */}
      <div ref={mainRef} className="relative z-10">

        {/* ── Hero ── */}
        <section className="h-[105vh] relative">
          <div className="sticky top-0 h-screen flex items-center justify-center">
            <div ref={heroTextRef} className="text-center px-6">
              {/* Eyebrow */}
              <p className="font-body text-[11px] tracking-[0.5em] text-white/40 uppercase mb-8">
                The future of dating
              </p>
              <h1
                ref={heroTitleRef}
                className="font-display text-7xl md:text-[8rem] lg:text-[12rem] font-bold tracking-cinematic text-white opacity-0 leading-[0.85]"
                style={{ textShadow: "0 4px 60px rgba(0,0,0,0.8), 0 2px 20px rgba(0,0,0,0.9), 0 0 120px rgba(255,77,109,0.15)" }}
              >
                Yuni
              </h1>
              <p
                ref={heroTaglineRef}
                className="mt-6 md:mt-10 font-body text-base md:text-lg tracking-[0.2em] text-white/80 opacity-0 uppercase font-medium"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)" }}
              >
                Find Your Group &mdash; Find Your Person
              </p>
            </div>
          </div>

          {/* Scroll hint */}
          <div
            ref={scrollHintRef}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4"
          >
            {/* Pulsing ring */}
            <div className="relative">
              <div className="absolute inset-0 w-[30px] h-[48px] rounded-full border border-white/10 animate-ping" style={{ animationDuration: "2s" }} />
              <div className="w-[30px] h-[48px] rounded-full border-2 border-white/40 flex items-start justify-center pt-2.5">
                <div className="w-[3px] h-[10px] bg-white/70 rounded-full animate-scroll-dot" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-[1px] bg-white/20" />
              <span className="text-[10px] tracking-[0.4em] text-white/50 uppercase font-body font-medium">
                Scroll to explore
              </span>
              <div className="w-6 h-[1px] bg-white/20" />
            </div>
            {/* Animated chevron */}
            <svg className="w-4 h-4 text-white/30 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </section>

        {/* ── Waitlist ── */}
        <section ref={waitlistSectionRef} className="min-h-screen flex items-center justify-center py-24 md:py-32 relative">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />
          <div className="waitlist-card relative z-10 w-full max-w-lg mx-auto px-6">
            <div className="relative p-8 md:p-12 border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden"
              style={{
                boxShadow: "0 0 80px rgba(255,77,109,0.06), 0 0 200px rgba(255,77,109,0.03), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Animated gradient border top */}
              <div className="absolute top-0 left-0 right-0 h-[1px]"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,77,109,0.5), rgba(255,255,255,0.2), rgba(255,77,109,0.5), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "gradient-shift 4s ease infinite",
                }}
              />
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-6 h-[1px] bg-white/10" />
              <div className="absolute top-0 left-0 w-[1px] h-6 bg-white/10" />
              <div className="absolute bottom-0 right-0 w-6 h-[1px] bg-white/10" />
              <div className="absolute bottom-0 right-0 w-[1px] h-6 bg-white/10" />

              <WaitlistFlow onSubmitSuccess={() => setSubmitted(true)} />
            </div>
          </div>
        </section>

        {/* ── Marquee strip 2 ── */}
        <Marquee />


        {/* ── Stats ── */}
        <section ref={statsSectionRef} className="py-32 relative">
          <div className="absolute inset-0 bg-background/40" />
          <div className="stats-inner relative z-10">
            <StatsCounter />
          </div>
        </section>

        {/* ── Spacer ── */}
        <section className="h-[105vh]" />

        {/* ── CTA ── */}
        <section ref={ctaSectionRef} className="min-h-[80vh] flex items-center justify-center py-32 relative">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          <div className="cta-inner relative z-10 text-center px-6">
            <p className="text-[9px] uppercase tracking-[0.4em] text-accent/50 mb-8 font-body">
              Coming to iOS & Android
            </p>
            <h2 className="font-display text-4xl md:text-6xl lg:text-8xl font-extralight tracking-cinematic mb-6 leading-tight">
              Your group is<br />
              <span className="text-accent/70">waiting</span>
            </h2>
            <p className="text-white/30 text-sm md:text-base max-w-md mx-auto mb-14 font-light leading-relaxed">
              Yuni takes the pressure off first dates by putting you in a group.
              Meet new people, have fun, and let real connections happen naturally.
            </p>

            {/* Magnetic-style CTA button */}
            <div className="inline-block group" data-cursor-hover>
              <button
                onClick={() => {
                  document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="relative px-12 py-5 font-display text-[10px] tracking-[0.3em] uppercase overflow-hidden border border-white/20 group-hover:border-accent/40 transition-colors duration-700"
              >
                {/* Hover fill */}
                <span className="absolute inset-0 bg-accent/0 group-hover:bg-accent transition-all duration-700" />
                <span className="relative text-white/80 group-hover:text-white transition-colors duration-500">
                  {submitted ? "You\u2019re on the list" : "Join the Waitlist"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <Footer />
      </div>
    </>
  );
}
