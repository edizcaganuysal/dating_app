"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const circle = circleRef.current;
    if (!dot || !circle) return;

    // Check for touch device
    if ("ontouchstart" in window) return;

    const moveDot = (e: MouseEvent) => {
      gsap.set(dot, { x: e.clientX, y: e.clientY });
    };

    const moveCircle = (e: MouseEvent) => {
      gsap.to(circle, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.6,
        ease: "power3.out",
      });
    };

    // Hover effects on interactive elements
    const onEnterInteractive = () => {
      gsap.to(circle, { scale: 2.5, opacity: 0.15, duration: 0.4, ease: "power2.out" });
      gsap.to(dot, { scale: 0.5, duration: 0.3 });
    };

    const onLeaveInteractive = () => {
      gsap.to(circle, { scale: 1, opacity: 0.3, duration: 0.4, ease: "power2.out" });
      gsap.to(dot, { scale: 1, duration: 0.3 });
    };

    window.addEventListener("mousemove", moveDot);
    window.addEventListener("mousemove", moveCircle);

    // Attach hover listeners to buttons, links, inputs
    const interactiveElements = document.querySelectorAll("a, button, input, [data-cursor-hover]");
    interactiveElements.forEach((el) => {
      el.addEventListener("mouseenter", onEnterInteractive);
      el.addEventListener("mouseleave", onLeaveInteractive);
    });

    // Hide default cursor
    document.body.style.cursor = "none";

    return () => {
      window.removeEventListener("mousemove", moveDot);
      window.removeEventListener("mousemove", moveCircle);
      document.body.style.cursor = "";
      interactiveElements.forEach((el) => {
        el.removeEventListener("mouseenter", onEnterInteractive);
        el.removeEventListener("mouseleave", onLeaveInteractive);
      });
    };
  }, []);

  return (
    <>
      {/* Small dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-[90] pointer-events-none mix-blend-difference"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#fff",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Larger follower circle */}
      <div
        ref={circleRef}
        className="fixed top-0 left-0 z-[89] pointer-events-none hidden md:block"
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.3)",
          opacity: 0.3,
          transform: "translate(-50%, -50%)",
        }}
      />
    </>
  );
}
