"use client";

import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-coal text-cream py-16">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start">
            <Image
              src="/logo.jpeg"
              alt="Yuni"
              width={80}
              height={35}
              className="h-7 w-auto object-contain brightness-0 invert"
            />
            <p className="text-xs tracking-wide text-cream/50 mt-2">
              Group dating for university students
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8">
            <a
              href="/privacy"
              className="text-xs tracking-wide text-cream/50 hover:text-cream transition-colors duration-300"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-xs tracking-wide text-cream/50 hover:text-cream transition-colors duration-300"
            >
              Terms
            </a>
            <a
              href="mailto:hello@yunisocial.com"
              className="text-xs tracking-wide text-cream/50 hover:text-cream transition-colors duration-300"
            >
              Contact
            </a>
          </div>

          {/* Social */}
          <a
            href="https://www.instagram.com/yuni.social"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-cream/50 hover:text-firelight transition-colors duration-300"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            <span className="text-xs tracking-wide">
              @yuni.social
            </span>
          </a>
        </div>

        <div className="mt-12 pt-8 border-t border-cream/10 text-center">
          <p className="text-xs text-cream/30">
            &copy; {new Date().getFullYear()} Yuni. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
