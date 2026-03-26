"use client";

export default function Footer() {
  return (
    <footer className="relative py-16 border-t border-white/[0.04] bg-background/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="font-display text-xl tracking-cinematic text-white/80">
              Yuni
            </p>
            <p className="text-[10px] tracking-[0.2em] text-white/40 mt-1 uppercase">
              Group dating for university students
            </p>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.04] text-center">
          <p className="text-[10px] tracking-[0.2em] text-white/30 uppercase">
            &copy; {new Date().getFullYear()} Yuni. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
