"use client";

import { useState } from "react";

const faqs = [
  {
    question: "How is Yuni different from other dating apps?",
    answer:
      "No swiping, no ghosting, no awkward 1-on-1 meetups with strangers. Yuni matches you into a group of 4-6 for a fun activity \u2014 bowling, dinner, karaoke. You meet in person that week, and afterward privately indicate if you\u2019re interested in anyone. Even without a romantic match, you had a great night out.",
  },
  {
    question: "Is it safe?",
    answer:
      "Safer than any 1-on-1 dating app. Every user is verified with a university email and a live selfie check. The group format means you\u2019re never alone with a stranger. The app only suggests public venues, and you can share your date details with a friend outside the app in one tap.",
  },
  {
    question: "What if I don\u2019t match with anyone?",
    answer:
      "Every date is a win. You still had a fun social experience with new people. Group chats stay open after the date, and many groups become real friend circles. It\u2019s not all-or-nothing \u2014 you\u2019re always gaining something.",
  },
  {
    question: "Can I bring my friends?",
    answer:
      "Yes! You can pre-group with 1-2 same-gender friends. If you and a friend go in as 2, the app finds 2 more of the opposite gender for a group of 4, or fills a group of 6 with the right balance. Gender split is always equal.",
  },
  {
    question: "Is it free?",
    answer:
      "The core experience is always free \u2014 you get 1 group date per week at no cost. Want more dates? You can purchase small credit packs. A free user\u2019s date is identical to a paying user\u2019s date. We never paywall quality.",
  },
  {
    question: "Which universities are supported?",
    answer:
      "We\u2019re launching at the University of Toronto and expanding to McGill, UBC, York, and Waterloo. More universities are being added every month. If your school isn\u2019t listed yet, join the waitlist \u2014 we\u2019ll let you know when we arrive.",
  },
  {
    question: "How does matching work?",
    answer:
      "Our algorithm considers your interests, personality, vibe-check answers, lifestyle habits, and activity preferences to build groups where everyone clicks. Groups always have equal gender split and compatible age ranges. Your private preferences (dealbreakers, age range) are never shown to others.",
  },
  {
    question: "When does Yuni launch?",
    answer:
      "Yuni launches in 2026, starting at the University of Toronto. Join the waitlist to secure your spot and be the first to know when we go live at your campus.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-6">
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-accent font-medium mb-4 font-display">
          Questions
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-coal">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="bg-white/50 rounded-2xl border border-coal/5 overflow-hidden">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className={i < faqs.length - 1 ? "border-b border-coal/[0.08]" : ""}>
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between py-5 px-6 md:px-8 text-left group"
              >
                <span className="font-body text-sm md:text-base font-medium text-coal group-hover:text-accent transition-colors duration-300 pr-8">
                  {faq.question}
                </span>
                <span
                  className={`shrink-0 w-5 h-5 flex items-center justify-center text-accent transition-transform duration-300 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </span>
              </button>
              <div
                className={`faq-answer ${
                  isOpen ? "max-h-60 pb-5" : "max-h-0"
                }`}
              >
                <p className="text-muted text-sm leading-relaxed px-6 md:px-8 pr-12">
                  {faq.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
