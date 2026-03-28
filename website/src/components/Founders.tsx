"use client";

export default function Founders() {
  return (
    <div className="max-w-4xl mx-auto px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-firelight font-medium mb-4 font-display">
        The team
      </p>
      <h2 className="font-editorial text-3xl md:text-5xl italic text-cream leading-tight mb-6">
        Built by students who were<br className="hidden md:block" /> tired of swiping.
      </h2>
      <p className="text-cream/60 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
        We&apos;re a team of students from the University of Toronto and Johns Hopkins
        University who experienced firsthand how broken dating apps are. We built Yuni
        because we believe meeting people should be fun, social, and pressure-free
        &mdash; the way it happens naturally on campus, not through a screen.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
        {/* Trust signals */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-full border border-cream/15 bg-cream/5">
          <svg className="w-5 h-5 text-firelight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
          </svg>
          <span className="text-sm text-cream/80">University of Toronto</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-full border border-cream/15 bg-cream/5">
          <svg className="w-5 h-5 text-firelight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
          </svg>
          <span className="text-sm text-cream/80">Johns Hopkins University</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-full border border-cream/15 bg-cream/5">
          <svg className="w-5 h-5 text-firelight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span className="text-sm text-cream/80">Verified &amp; Safe</span>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 rounded-full border border-cream/15 bg-cream/5">
          <svg className="w-5 h-5 text-firelight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <span className="text-sm text-cream/80">Built for Students</span>
        </div>
      </div>
    </div>
  );
}
