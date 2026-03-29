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
import WhyYuni from "@/components/WhyYuni";
import HowItWorks from "@/components/HowItWorks";
import Founders from "@/components/Founders";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 60;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const currentFrameRef = useRef(0);

  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroTaglineRef = useRef<HTMLParagraphElement>(null);
  const heroCTARef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const waitlistSectionRef = useRef<HTMLDivElement>(null);
  const whyYuniSectionRef = useRef<HTMLDivElement>(null);
  const howItWorksSectionRef = useRef<HTMLDivElement>(null);
  const foundersSectionRef = useRef<HTMLDivElement>(null);
  const faqSectionRef = useRef<HTMLDivElement>(null);

  const [, setSubmitted] = useState(false);
  const [preloaderDone, setPreloaderDone] = useState(false);

  const getFramePath = useCallback(
    (index: number) =>
      `/sequence-2/frame-${String(index + 1).padStart(4, "0")}.webp`,
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
    gsap.fromTo(heroCTARef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        scrollTrigger: { trigger: heroTextRef.current, start: "top 50%", end: "top 15%", scrub: 1 },
      }
    );
    gsap.to([heroTitleRef.current, heroTaglineRef.current, heroCTARef.current], {
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

    // ── WHY YUNI ──
    const whyInner = whyYuniSectionRef.current?.querySelector(".why-inner");
    if (whyInner) {
      gsap.fromTo(whyInner,
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0,
          scrollTrigger: { trigger: whyYuniSectionRef.current, start: "top 75%", end: "top 35%", scrub: 1 },
        }
      );
    }

    // ── HOW IT WORKS ──
    const howInner = howItWorksSectionRef.current?.querySelector(".how-inner");
    if (howInner) {
      gsap.fromTo(howInner,
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0,
          scrollTrigger: { trigger: howItWorksSectionRef.current, start: "top 75%", end: "top 35%", scrub: 1 },
        }
      );
    }

    // ── FOUNDERS ──
    const foundersInner = foundersSectionRef.current?.querySelector(".founders-inner");
    if (foundersInner) {
      gsap.fromTo(foundersInner,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          scrollTrigger: { trigger: foundersSectionRef.current, start: "top 70%", end: "top 40%", scrub: 1 },
        }
      );
    }

    // ── FAQ ──
    const faqInner = faqSectionRef.current?.querySelector(".faq-inner");
    if (faqInner) {
      gsap.fromTo(faqInner,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          scrollTrigger: { trigger: faqSectionRef.current, start: "top 75%", end: "top 45%", scrub: 1 },
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
          background: "radial-gradient(ellipse at center, transparent 20%, rgba(36,28,26,0.5) 100%)",
        }}
      />

      {/* ═══ SCROLL CONTENT ═══ */}
      <div ref={mainRef} className="relative z-10">

        {/* ── Hero ── */}
        <section className="h-screen relative">
          <div className="sticky top-0 h-screen flex items-center justify-center">
            <div ref={heroTextRef} className="text-center px-6">
              {/* Eyebrow */}
              <p className="font-body text-[11px] tracking-[0.5em] text-white/70 uppercase mb-8">
                The group dating app for university students
              </p>
              <h1
                ref={heroTitleRef}
                className="font-display text-7xl md:text-[8rem] lg:text-[12rem] font-bold tracking-cinematic text-white opacity-0 leading-[0.85]"
                style={{ textShadow: "0 4px 60px rgba(0,0,0,0.8), 0 2px 20px rgba(0,0,0,0.9), 0 0 120px rgba(196,0,24,0.15)" }}
              >
                Yuni
              </h1>
              <p
                ref={heroTaglineRef}
                className="mt-6 md:mt-10 font-body text-base md:text-lg tracking-[0.2em] text-white/90 opacity-0 uppercase font-medium"
                style={{ textShadow: "0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)" }}
              >
                Find Your Group &mdash; Find Your Person
              </p>

              {/* Hero CTA */}
              <div ref={heroCTARef} className="mt-10 md:mt-14 opacity-0">
                <div className="inline-block group" data-cursor-hover>
                  <button
                    onClick={() => {
                      document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="relative px-10 py-4 font-display text-[10px] tracking-[0.3em] uppercase overflow-hidden border border-white/30 group-hover:border-accent/50 transition-colors duration-700"
                  >
                    <span className="absolute inset-0 bg-accent/0 group-hover:bg-accent transition-all duration-700" />
                    <span className="relative text-white/90 group-hover:text-white transition-colors duration-500">
                      Join the Waitlist
                    </span>
                  </button>
                </div>
              </div>
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
              <div className="w-6 h-[1px] bg-white/30" />
              <span className="text-[10px] tracking-[0.4em] text-white/60 uppercase font-body font-medium">
                Scroll to explore
              </span>
              <div className="w-6 h-[1px] bg-white/30" />
            </div>
            {/* Animated chevron */}
            <svg className="w-4 h-4 text-white/40 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </section>

        {/* ── Waitlist ── */}
        <section ref={waitlistSectionRef} className="min-h-screen flex items-center justify-center py-24 md:py-32 relative bg-[#241C1A]">
          <div className="absolute inset-0" />
          <div className="waitlist-card relative z-10 w-full max-w-lg mx-auto px-6">
            <div className="relative p-8 md:p-12 border border-white/[0.15] bg-white/[0.08] backdrop-blur-xl overflow-hidden"
              style={{
                boxShadow: "0 0 80px rgba(196,0,24,0.06), 0 0 200px rgba(196,0,24,0.03), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Animated gradient border top */}
              <div className="absolute top-0 left-0 right-0 h-[1px]"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(196,0,24,0.5), rgba(255,255,255,0.2), rgba(196,0,24,0.5), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "gradient-shift 4s ease infinite",
                }}
              />
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-6 h-[1px] bg-white/20" />
              <div className="absolute top-0 left-0 w-[1px] h-6 bg-white/20" />
              <div className="absolute bottom-0 right-0 w-6 h-[1px] bg-white/20" />
              <div className="absolute bottom-0 right-0 w-[1px] h-6 bg-white/20" />

              <WaitlistFlow onSubmitSuccess={() => setSubmitted(true)} />
            </div>
          </div>
        </section>

        {/* ── Marquee ── */}
        <Marquee />

        {/* ── Why Yuni ── */}
        <section ref={whyYuniSectionRef} className="py-24 md:py-32 relative bg-[#1a1412]">
          <div className="why-inner relative z-10">
            <WhyYuni />
          </div>
        </section>

        {/* ── How It Works ── */}
        <section ref={howItWorksSectionRef} className="py-24 md:py-32 relative bg-[#241C1A]">
          <div className="how-inner relative z-10">
            <HowItWorks />
          </div>
        </section>

        {/* ── Founders ── */}
        <section ref={foundersSectionRef} className="py-24 md:py-32 relative bg-[#1a1412]">
          <div className="founders-inner relative z-10">
            <Founders />
          </div>
        </section>

        {/* ── FAQ ── */}
        <section ref={faqSectionRef} className="py-24 md:py-32 relative bg-[#241C1A]">
          <div className="faq-inner relative z-10">
            <FAQ />
          </div>
        </section>

        {/* ── Footer ── */}
        <Footer />
      </div>
    </>
  );
}
