"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getWaitlistCount } from "@/lib/api";

gsap.registerPlugin(ScrollTrigger);

function AnimatedCounter({
  value,
  suffix,
  prefix,
  triggered,
}: {
  value: number;
  suffix: string;
  prefix: string;
  triggered: boolean;
}) {
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!triggered || !countRef.current) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: value,
      duration: 2.5,
      ease: "power2.out",
      onUpdate: () => {
        if (countRef.current) {
          countRef.current.textContent = `${prefix}${Math.floor(obj.val).toLocaleString()}${suffix}`;
        }
      },
    });
  }, [triggered, value, suffix, prefix]);

  return (
    <span ref={countRef} className="font-display text-5xl md:text-6xl lg:text-7xl font-extralight">
      {prefix}0{suffix}
    </span>
  );
}

export default function StatsCounter() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(75);

  useEffect(() => {
    getWaitlistCount().then((c) => setWaitlistCount(c || 75));
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top 70%",
        onEnter: () => setTriggered(true),
        once: true,
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const stats = [
    { label: "On the Waitlist", value: waitlistCount, suffix: "", prefix: "" },
    { label: "Universities", value: 20, suffix: "+", prefix: "" },
    { label: "Launch Year", value: 2026, suffix: "", prefix: "" },
  ];

  return (
    <div ref={sectionRef} className="max-w-5xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 text-center">
        {stats.map((stat, i) => (
          <div key={i} className="space-y-3">
            <AnimatedCounter {...stat} triggered={triggered} />
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-body">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
