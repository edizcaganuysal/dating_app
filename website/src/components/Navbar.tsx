"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-cream/90 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Yuni"
            width={120}
            height={55}
            className="h-10 w-auto object-contain"
            priority
          />
        </a>

        <button
          onClick={() => {
            document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="bg-accent text-cream font-display text-xs tracking-wide uppercase px-6 py-2.5 rounded-full hover:bg-accent/90 transition-colors duration-300 font-medium"
        >
          Join Waitlist
        </button>
      </div>
    </nav>
  );
}
