"use client";

import { useEffect, useRef, useState } from "react";
import { joinWaitlist } from "@/lib/api";

interface WaitlistFlowProps {
  onSubmitSuccess?: () => void;
}

const UNIVERSITIES = [
  "University of Toronto",
  "McGill University",
  "University of British Columbia",
  "York University",
  "University of Waterloo",
  "Western University",
  "Queen's University",
  "McMaster University",
  "University of Ottawa",
  "University of Alberta",
];

const VALID_EMAIL_DOMAINS = [
  ".edu",
  ".utoronto.ca",
  ".mail.utoronto.ca",
  ".yorku.ca",
  ".mcgill.ca",
  ".ubc.ca",
  ".uwaterloo.ca",
  ".uwo.ca",
  ".queensu.ca",
  ".mcmaster.ca",
  ".uottawa.ca",
  ".ualberta.ca",
];

function isValidUniversityEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return VALID_EMAIL_DOMAINS.some((domain) => lower.endsWith(domain));
}

const WEBSITE_URL = "https://yunisocial.com";

export default function WaitlistFlow({ onSubmitSuccess }: WaitlistFlowProps) {
  const successRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [position, setPosition] = useState(0);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (submitted) {
      requestAnimationFrame(() => setShowSuccess(true));
    }
  }, [submitted]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredUniversities = UNIVERSITIES.filter((u) =>
    u.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function selectUniversity(uni: string) {
    setUniversity(uni);
    setSearchQuery("");
    setDropdownOpen(false);
    if (uni !== "Other") {
      setCustomUniversity("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("All fields are required.");
      return;
    }

    const finalUniversity = university === "Other" ? customUniversity.trim() : university;
    if (!finalUniversity) {
      setError("Please select your university.");
      return;
    }

    if (!isValidUniversityEmail(email)) {
      setError("Please use your university email address (.edu or university domain).");
      return;
    }

    setLoading(true);
    try {
      const res = await joinWaitlist({
        name: name.trim(),
        email: email.trim(),
        university: finalUniversity,
      });
      setPosition(res.position + 150);
      setSubmitted(true);
      onSubmitSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    const text = `I just joined the Yuni waitlist! Group dating for university students. Join me: ${WEBSITE_URL}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silently
    }
  }

  return (
    <div id="waitlist" className="w-full">
      {!submitted ? (
        <>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-center text-coal mb-3">
            Join the Waitlist
          </h2>

          <p className="text-center text-muted text-sm mb-10">
            Be the first to know when Yuni launches at your campus.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted/80 mb-2 font-display font-medium">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-transparent border-b-2 border-input-border focus:border-accent outline-none py-3 text-coal text-base tracking-wide placeholder:text-coal/30 transition-colors duration-300"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted/80 mb-1 font-display font-medium">
                University Email
              </label>
              <p className="text-[11px] text-muted/60 mb-2">
                Use your .edu or university email address
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full bg-transparent border-b-2 border-input-border focus:border-accent outline-none py-3 text-coal text-base tracking-wide placeholder:text-coal/30 transition-colors duration-300"
              />
            </div>

            {/* University Dropdown */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-xs uppercase tracking-wider text-muted/80 mb-2 font-display font-medium">
                University
              </label>

              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-transparent border-b-2 border-input-border focus:border-accent outline-none py-3 text-left text-base tracking-wide transition-colors duration-300 flex items-center justify-between"
              >
                <span className={university ? "text-coal" : "text-coal/30"}>
                  {university || "Select your university"}
                </span>
                <svg
                  className={`w-4 h-4 text-muted transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 border border-coal/10 bg-cream rounded-xl shadow-lg max-h-64 overflow-hidden">
                  {/* Search input */}
                  <div className="p-3 border-b border-coal/[0.06]">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search universities..."
                      className="w-full bg-transparent outline-none text-sm text-coal placeholder:text-coal/30"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredUniversities.map((uni) => (
                      <button
                        key={uni}
                        type="button"
                        onClick={() => selectUniversity(uni)}
                        className="w-full text-left px-4 py-3 text-sm text-coal/70 hover:text-coal hover:bg-coal/[0.04] transition-colors duration-200"
                      >
                        {uni}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => selectUniversity("Other")}
                      className="w-full text-left px-4 py-3 text-sm text-accent hover:bg-coal/[0.04] transition-colors duration-200 border-t border-coal/[0.06]"
                    >
                      Other (type your university)
                    </button>
                  </div>
                </div>
              )}

              {/* Custom university input when "Other" is selected */}
              {university === "Other" && (
                <input
                  type="text"
                  value={customUniversity}
                  onChange={(e) => setCustomUniversity(e.target.value)}
                  placeholder="Type your university name"
                  className="w-full bg-transparent border-b-2 border-input-border focus:border-accent outline-none py-3 text-coal text-base tracking-wide placeholder:text-coal/30 transition-colors duration-300 mt-4"
                />
              )}
            </div>

            {error && (
              <p className="text-accent text-sm text-center font-medium">{error}</p>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-accent text-cream font-display text-sm tracking-wide uppercase rounded-lg hover:bg-accent/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : (
                  "Join the Waitlist"
                )}
              </button>
              <p className="text-center text-[11px] text-muted/50 mt-3">
                By joining, you agree to our{" "}
                <a href="/terms" className="text-muted/70 hover:text-accent underline underline-offset-2 transition-colors">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-muted/70 hover:text-accent underline underline-offset-2 transition-colors">
                  Privacy Policy
                </a>
              </p>
            </div>
          </form>
        </>
      ) : (
        <div
          ref={successRef}
          className={`text-center transition-all duration-700 ${
            showSuccess ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-coal mb-4">
            You&apos;re In
          </h2>

          <div className="mb-6">
            <span className="text-muted text-xs tracking-wider uppercase">Your position</span>
            <p className="font-display text-6xl md:text-7xl font-bold text-accent mt-1">
              #{position}
            </p>
          </div>

          <p className="text-muted text-sm max-w-xs mx-auto leading-relaxed mb-8">
            We&apos;ll email you as soon as Yuni is ready at your campus.
          </p>

          {/* Share section */}
          <div className="border-t border-coal/10 pt-6">
            <p className="text-xs uppercase tracking-wider text-muted/60 mb-4 font-display">
              Tell your friends
            </p>

            <div className="flex items-center justify-center gap-3">
              {/* Copy share link */}
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-5 py-2.5 border border-coal/15 hover:border-accent/40 text-coal/70 hover:text-coal text-xs tracking-wide font-medium rounded-lg transition-all duration-300"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                {copied ? "Copied!" : "Copy Link"}
              </button>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/yuni.social"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 border border-coal/15 hover:border-accent/40 text-coal/70 hover:text-coal text-xs tracking-wide font-medium rounded-lg transition-all duration-300"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Follow Us
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
