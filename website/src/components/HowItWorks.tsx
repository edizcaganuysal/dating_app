"use client";

const steps = [
  {
    number: "01",
    title: "Get Matched",
    description:
      "We put together a group of 4-6 students who actually have stuff in common. Equal gender split, personality-matched, activity-based.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Go Out",
    description:
      "Bowling, dinner, karaoke, escape rooms \u2014 real activities, not awkward coffee staring. You\u2019ll actually have fun even if there\u2019s no spark.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Indicate Interest",
    description:
      "After the date, privately tell us who caught your eye. No one sees your pick unless it\u2019s mutual. Zero awkwardness.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Match & Chat",
    description:
      "Mutual interest? You unlock a private 1-on-1 chat. No match? You still had an amazing night out with new friends.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-accent font-medium mb-4 font-display">
          How it works
        </p>
        <h2 className="font-editorial text-4xl md:text-5xl lg:text-6xl italic text-coal leading-tight">
          Your Friday night, sorted.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {steps.map((step, i) => (
          <div
            key={i}
            className="group relative p-8 bg-white/60 border border-coal/10 rounded-xl hover:shadow-lg transition-all duration-300"
          >
            <span className="absolute top-6 right-6 font-display text-5xl font-bold text-accent/[0.07] group-hover:text-accent/[0.14] transition-colors duration-500">
              {step.number}
            </span>

            <div className="text-accent mb-5">
              {step.icon}
            </div>

            <h3 className="font-display text-xl md:text-2xl font-semibold tracking-tight mb-3 text-coal">
              {step.title}
            </h3>
            <p className="text-muted text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
