"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import WaitlistFlow from "@/components/WaitlistFlow";
import WhyYuni from "@/components/WhyYuni";
import HowItWorks from "@/components/HowItWorks";
import Founders from "@/components/Founders";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function Home() {
  const [submitted, setSubmitted] = useState(false);
  const [preloaderDone, setPreloaderDone] = useState(false);

  // Scroll reveal observer
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Countdown Preloader */}
      {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}

      <Navbar />

      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 bg-cream text-center">
        <Image
          src="/logo.png"
          alt="Yuni Social"
          width={280}
          height={130}
          className="h-24 md:h-36 w-auto object-contain mb-8"
          priority
        />

        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-coal tracking-tight leading-[1.1] max-w-4xl">
          The group dating app for{" "}
          <span className="text-accent">university students</span>
        </h1>

        <p className="mt-6 text-muted text-base md:text-lg text-center max-w-xl leading-relaxed">
          Stop swiping. Start meeting. Get matched into groups of 4-6 for
          real activities with real people from your campus.
        </p>

        <button
          onClick={() => {
            document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="mt-10 bg-accent text-cream px-10 py-4 rounded-full font-display text-sm tracking-wide uppercase hover:bg-accent/90 transition-colors duration-300 font-medium"
        >
          Join the Waitlist
        </button>

        {/* Scroll hint */}
        <div className="mt-16 md:mt-24 flex flex-col items-center gap-2 opacity-50">
          <span className="text-xs tracking-wider text-muted uppercase">Scroll to explore</span>
          <svg className="w-4 h-4 text-muted animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 md:py-32 bg-cream">
        <div className="reveal">
          <HowItWorks />
        </div>
      </section>

      {/* ── Why Yuni ── */}
      <section className="py-24 md:py-32 bg-background" style={{ background: "rgba(255,255,255,0.35)" }}>
        <div className="reveal">
          <WhyYuni />
        </div>
      </section>

      {/* ── Founders / Trust ── */}
      <section className="py-24 md:py-32 bg-coal">
        <div className="reveal">
          <Founders />
        </div>
      </section>

      {/* ── Waitlist Form ── */}
      <section className="py-24 md:py-32 bg-cream" id="waitlist-section">
        <div className="reveal">
          <div className="max-w-lg mx-auto px-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-coal/5">
              <WaitlistFlow onSubmitSuccess={() => setSubmitted(true)} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 md:py-32 bg-cream">
        <div className="reveal">
          <FAQ />
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 md:py-28 bg-cream">
        <div className="reveal">
          <div className="text-center px-6">
            <h2 className="font-editorial text-3xl md:text-5xl italic text-coal mb-6">
              Ready to try something{" "}
              <span className="text-accent">different</span>?
            </h2>
            <p className="text-muted text-base md:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
              Your next great night out is one signup away. Join the waitlist and
              we&apos;ll let you know the moment Yuni launches at your campus.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => {
                  document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-accent text-cream px-10 py-4 rounded-full font-display text-sm tracking-wide uppercase hover:bg-accent/90 transition-colors duration-300 font-medium"
              >
                {submitted ? "You\u2019re on the list" : "Join the Waitlist"}
              </button>
              <a
                href="https://www.instagram.com/yuni.social"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-4 text-muted hover:text-accent text-sm transition-colors duration-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Follow our journey
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
