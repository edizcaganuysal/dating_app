"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useImagePreloader } from "@/hooks/useImagePreloader";

gsap.registerPlugin(ScrollTrigger);

const FRAME_COUNT = 150;

export default function HeroScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const currentFrameRef = useRef(0);

  const getFramePath = useCallback(
    (index: number) =>
      `/sequence-1/frame-${String(index + 1).padStart(4, "0")}.jpg`,
    []
  );

  const { images, progress, firstFrameLoaded } = useImagePreloader(
    FRAME_COUNT,
    getFramePath
  );

  // Draw frame to canvas
  const drawFrame = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const img = images.current[index];

      if (!canvas || !ctx || !img) return;

      // Find nearest loaded frame if current isn't loaded
      let frameImg = img;
      if (!frameImg?.complete) {
        for (let offset = 1; offset < FRAME_COUNT; offset++) {
          const below = images.current[index - offset];
          if (below?.complete) {
            frameImg = below;
            break;
          }
          const above = images.current[index + offset];
          if (above?.complete) {
            frameImg = above;
            break;
          }
        }
      }

      if (!frameImg?.complete) return;

      // Cover fit
      const scale = Math.max(
        canvas.width / frameImg.naturalWidth,
        canvas.height / frameImg.naturalHeight
      );
      const x = (canvas.width - frameImg.naturalWidth * scale) / 2;
      const y = (canvas.height - frameImg.naturalHeight * scale) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        frameImg,
        x,
        y,
        frameImg.naturalWidth * scale,
        frameImg.naturalHeight * scale
      );
    },
    [images]
  );

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = "100vw";
      canvas!.style.height = "100vh";
      drawFrame(currentFrameRef.current);
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawFrame]);

  // Draw first frame when ready
  useEffect(() => {
    if (firstFrameLoaded) {
      drawFrame(0);
    }
  }, [firstFrameLoaded, drawFrame]);

  // GSAP ScrollTrigger
  useEffect(() => {
    if (!containerRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
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

    // Title animation
    const titleTl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "5% top",
        end: "25% top",
        scrub: 1,
      },
    });

    titleTl.fromTo(
      titleRef.current,
      { opacity: 0, y: 60, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 1 }
    );

    // Tagline animation
    const taglineTl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "20% top",
        end: "35% top",
        scrub: 1,
      },
    });

    taglineTl.fromTo(
      taglineRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1 }
    );

    // Fade out everything
    const fadeOutTl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "65% top",
        end: "85% top",
        scrub: 1,
      },
    });

    fadeOutTl.to([titleRef.current, taglineRef.current], {
      opacity: 0,
      y: -40,
      duration: 1,
    });

    // Scroll hint fade out
    gsap.to(scrollHintRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "2% top",
        end: "8% top",
        scrub: true,
      },
      opacity: 0,
    });

    return () => {
      trigger.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [drawFrame]);

  return (
    <div ref={containerRef} className="relative" style={{ height: "300vh" }}>
      {/* Sticky canvas */}
      <canvas
        ref={canvasRef}
        className="sticky top-0 left-0 z-0"
        style={{ width: "100vw", height: "100vh" }}
      />

      {/* Dark overlay for text readability */}
      <div className="sticky top-0 left-0 w-screen h-screen z-10 pointer-events-none flex flex-col items-center justify-center"
        style={{ marginTop: "-100vh" }}
      >
        {/* Loading indicator */}
        {progress < 1 && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2">
            <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent/60 rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Title */}
        <h1
          ref={titleRef}
          className="font-display text-6xl md:text-8xl lg:text-9xl font-light tracking-cinematic text-white opacity-0 text-center"
          style={{ textShadow: "0 4px 60px rgba(0,0,0,0.5)" }}
        >
          LoveGenie
        </h1>

        {/* Tagline */}
        <p
          ref={taglineRef}
          className="mt-6 font-body text-lg md:text-xl tracking-wide text-white/80 opacity-0 text-center max-w-lg"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
        >
          Find Your Group. Find Your Person.
        </p>

        {/* Scroll hint */}
        <div
          ref={scrollHintRef}
          className="absolute bottom-12 flex flex-col items-center gap-3"
        >
          <span className="text-xs tracking-widest text-white/40 uppercase font-body">
            Scroll to explore
          </span>
          <div className="w-[1px] h-8 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}
