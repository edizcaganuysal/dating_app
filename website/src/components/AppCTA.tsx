"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function AppCTA() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Phone float in
      gsap.fromTo(
        phoneRef.current,
        { opacity: 0, y: 100, rotateZ: 5 },
        {
          opacity: 1,
          y: 0,
          rotateZ: 0,
          duration: 1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            end: "top 30%",
            scrub: 1,
          },
        }
      );

      // Content fade in
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, x: 40 },
        {
          opacity: 1,
          x: 0,
          duration: 1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
            end: "top 30%",
            scrub: 1,
          },
        }
      );

      // Continuous float on phone
      gsap.to(phoneRef.current, {
        y: -12,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 md:py-48 bg-background overflow-hidden"
    >
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16 md:gap-24">
        {/* Phone mockup */}
        <div ref={phoneRef} className="flex-shrink-0 opacity-0">
          <div className="relative w-64 h-[520px] rounded-[3rem] border-2 border-white/10 bg-white/[0.03] p-3 shadow-2xl shadow-accent/5">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-background rounded-b-2xl" />

            {/* Screen */}
            <div className="w-full h-full rounded-[2.4rem] bg-gradient-to-b from-accent/10 via-background to-background flex flex-col items-center justify-center p-6">
              <div className="text-accent/40 mb-4">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <p className="font-display text-lg tracking-cinematic text-white/30">
                LoveGenie
              </p>
              <p className="text-[10px] text-white/15 mt-2 tracking-wide">
                Coming soon
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 text-center md:text-left opacity-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent/60 mb-4 font-body">
            Coming to iOS & Android
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-light tracking-wide mb-6">
            Your group is
            <br />
            <span className="text-accent/80">waiting</span>
          </h2>
          <p className="text-muted text-sm md:text-base leading-relaxed max-w-md mb-10 font-light">
            LoveGenie takes the pressure off first dates by putting you in a group.
            Meet new people, have fun, and let real connections happen naturally.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <button
              onClick={() => {
                document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-4 bg-white text-background font-display text-xs tracking-cinematic uppercase hover:bg-accent hover:text-white transition-all duration-500"
            >
              Join the Waitlist
            </button>
            <button className="px-8 py-4 border border-white/10 text-white/60 font-display text-xs tracking-cinematic uppercase hover:border-white/30 hover:text-white transition-all duration-500 cursor-default">
              App Store — Soon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
