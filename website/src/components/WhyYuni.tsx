"use client";

const painPoints = [
  {
    stat: "80%",
    caption: "of matches never become a date",
    description:
      "You match, you chat for 3 days, then... nothing. Sound familiar? Most connections on dating apps go absolutely nowhere.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
      </svg>
    ),
  },
  {
    stat: "90 min",
    caption: "spent swiping every single day",
    description:
      "That's a whole lecture spent judging people by their first photo. Your time deserves better than an endless scroll.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    stat: "$10B",
    caption: "industry that profits from you being single",
    description:
      "If everyone found their person in a week, the business dies. Their algorithm feeds you just enough hope to keep you paying.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function WhyYuni() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-accent font-medium mb-4 font-display">
          Why group dating?
        </p>
        <h2 className="font-editorial text-4xl md:text-5xl lg:text-6xl italic text-coal leading-tight">
          Swiping is a dead end.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {painPoints.map((point, i) => (
          <div
            key={i}
            className="group p-8 bg-white/60 border border-coal/10 rounded-xl hover:shadow-lg transition-all duration-300"
          >
            <div className="text-accent mb-4">
              {point.icon}
            </div>
            <p className="font-display text-4xl md:text-5xl font-bold text-coal mb-1">
              {point.stat}
            </p>
            <p className="text-xs uppercase tracking-[0.15em] text-ember font-medium mb-4 font-display">
              {point.caption}
            </p>
            <p className="text-muted text-sm leading-relaxed">
              {point.description}
            </p>
          </div>
        ))}
      </div>

      <div className="text-center mt-16">
        <p className="font-editorial text-2xl md:text-3xl italic text-coal">
          Yuni is <span className="text-accent">different</span>.
        </p>
      </div>
    </div>
  );
}
