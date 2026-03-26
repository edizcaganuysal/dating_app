"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { joinWaitlist, getWaitlistCount } from "@/lib/api";

interface WaitlistFlowProps {
  onSubmitSuccess?: () => void;
}

export default function WaitlistFlow({ onSubmitSuccess }: WaitlistFlowProps) {
  const successRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState(0);
  const [waitlistCount, setWaitlistCount] = useState(75);

  useEffect(() => {
    getWaitlistCount().then((c) => setWaitlistCount(c || 75));
  }, []);

  useEffect(() => {
    if (submitted && successRef.current) {
      gsap.fromTo(
        successRef.current,
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(1.4)" }
      );
    }
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !university.trim()) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await joinWaitlist({
        name: name.trim(),
        email: email.trim(),
        university: university.trim(),
      });
      setPosition(res.position);
      setWaitlistCount(res.position);
      setSubmitted(true);
      onSubmitSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="waitlist" className="w-full">
      {!submitted ? (
        <>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-extralight tracking-cinematic text-center mb-4">
            Join the Waitlist
          </h2>

          <p className="text-center text-muted/70 text-sm tracking-wide mb-2">
            Be the first to know when Yuni launches.
          </p>

          {waitlistCount > 0 && (
            <p className="text-center text-accent/60 text-xs tracking-wide mb-10">
              {waitlistCount.toLocaleString()} {waitlistCount === 1 ? "person has" : "people have"} already joined
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Name */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3 font-body">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-transparent border-b border-white/10 focus:border-accent/40 outline-none py-3 text-white text-lg font-light tracking-wide placeholder:text-white/10 transition-colors duration-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3 font-body">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full bg-transparent border-b border-white/10 focus:border-accent/40 outline-none py-3 text-white text-lg font-light tracking-wide placeholder:text-white/10 transition-colors duration-500"
              />
            </div>

            {/* University */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-white/30 mb-3 font-body">
                University
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. University of Toronto"
                className="w-full bg-transparent border-b border-white/10 focus:border-accent/40 outline-none py-3 text-white text-lg font-light tracking-wide placeholder:text-white/10 transition-colors duration-500"
              />
            </div>

            {error && (
              <p className="text-accent text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white/90 text-background font-display text-xs tracking-cinematic uppercase hover:bg-accent hover:text-white transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Joining...
                </span>
              ) : (
                "Join the Waitlist"
              )}
            </button>
          </form>
        </>
      ) : (
        <div ref={successRef} className="text-center opacity-0">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full border border-accent/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="font-display text-4xl md:text-5xl font-extralight tracking-cinematic mb-6">
            You&apos;re In
          </h2>

          <div className="mb-8">
            <span className="text-white/40 text-xs tracking-[0.2em] uppercase">Your position</span>
            <p className="font-display text-7xl md:text-8xl font-extralight text-accent/80 mt-2">
              #{position}
            </p>
          </div>

          <p className="text-white/40 text-sm tracking-wide max-w-xs mx-auto leading-relaxed">
            We&apos;ll email you as soon as Yuni is ready.
          </p>
        </div>
      )}
    </div>
  );
}
