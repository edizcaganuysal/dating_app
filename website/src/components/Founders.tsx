"use client";

export default function Founders() {
  return (
    <div className="max-w-4xl mx-auto px-6 text-center">
      <p className="text-[10px] uppercase tracking-[0.4em] text-accent/60 mb-5 font-body">
        The team
      </p>
      <h2 className="font-display text-3xl md:text-5xl font-extralight tracking-cinematic leading-tight mb-6">
        Built by students who were<br />tired of <span className="text-accent/80">swiping</span>.
      </h2>
      <p className="text-white/50 text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-10 font-light">
        We&apos;re a team from the University of Toronto and Johns Hopkins University
        who experienced firsthand how broken dating apps are. We built Yuni because
        meeting people should be fun, social, and pressure-free.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2 px-5 py-2.5 border border-white/[0.10] bg-white/[0.03]">
          <svg className="w-4 h-4 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
          </svg>
          <span className="text-[10px] tracking-[0.15em] text-white/60 uppercase font-body">University of Toronto</span>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 border border-white/[0.10] bg-white/[0.03]">
          <svg className="w-4 h-4 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
          </svg>
          <span className="text-[10px] tracking-[0.15em] text-white/60 uppercase font-body">Johns Hopkins University</span>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 border border-white/[0.10] bg-white/[0.03]">
          <svg className="w-4 h-4 text-accent/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span className="text-[10px] tracking-[0.15em] text-white/60 uppercase font-body">Verified &amp; Safe</span>
        </div>
      </div>
    </div>
  );
}
