"use client";

const features = [
  {
    title: "Group Dates",
    subtitle: "Real Connections",
    description:
      "Get matched into groups of 4-6. Go on activity-based dates with zero awkward one-on-one pressure.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: "AI-Powered",
    subtitle: "Compatibility",
    description:
      "Our algorithm weighs personality, interests, vibes, and lifestyle to build your ideal group.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    title: "Safe &",
    subtitle: "Verified",
    description:
      "University email verification + selfie check. Everyone is who they say they are.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: "From Group",
    subtitle: "to 1-on-1",
    description:
      "After the date, indicate mutual interest. Match? You get a private chat.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
];

export default function FeatureShowcase() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="mb-16">
        <p className="text-[10px] uppercase tracking-[0.3em] text-accent/50 mb-4 font-body">
          How it works
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-extralight tracking-wide">
          Dating, reimagined
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {features.map((feature, i) => (
          <div
            key={i}
            className="group p-8 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-700 bg-white/[0.02] backdrop-blur-sm"
          >
            <div className="text-accent/40 mb-5 group-hover:text-accent/70 transition-colors duration-500">
              {feature.icon}
            </div>
            <h3 className="font-display text-lg md:text-xl font-light tracking-wide leading-tight">
              {feature.title}
            </h3>
            <h3 className="font-display text-lg md:text-xl font-light tracking-wide text-accent/60 mb-4">
              {feature.subtitle}
            </h3>
            <p className="text-white/40 text-sm leading-relaxed font-light">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
