"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Navbar() {
  const navRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    // Show navbar after scrolling past hero
    ScrollTrigger.create({
      trigger: document.body,
      start: "200px top",
      onEnter: () => {
        gsap.fromTo(navRef.current, { y: -60 }, { y: 0, duration: 0.6, ease: "power3.out" });
      },
      onLeaveBack: () => {
        gsap.to(navRef.current, { y: -60, duration: 0.3 });
      },
    });

    // Track scroll progress
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => setScrollProgress(self.progress),
    });
  }, []);

  return (
    <div
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-[60]"
      style={{ transform: "translateY(-60px)" }}
    >
      {/* Scroll progress bar */}
      <div className="h-[1px] bg-white/5">
        <div
          className="h-full bg-accent/50 transition-none"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>

      {/* Nav content */}
      <div className="flex items-center justify-between px-6 md:px-12 py-4 bg-background/40 backdrop-blur-md border-b border-white/[0.04]">
        <p className="font-display text-sm tracking-[0.3em] text-white/60 uppercase">
          Yuni
        </p>

        <button
          onClick={() => {
            document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="text-[10px] tracking-[0.25em] text-white/40 uppercase font-body hover:text-accent transition-colors duration-300"
          data-cursor-hover
        >
          Join Waitlist
        </button>
      </div>
    </div>
  );
}
