import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Yuni",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-white">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] text-white/40 uppercase font-body hover:text-accent/70 transition-colors duration-300 mb-12"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to home
        </Link>

        <h1 className="font-display text-4xl md:text-5xl font-extralight tracking-cinematic mb-4">
          Terms of Service
        </h1>
        <p className="text-white/40 text-sm mb-16">
          Last updated: March 2026
        </p>

        <div className="space-y-10 text-white/60 text-sm leading-relaxed font-light">
          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Yuni, including joining our waitlist, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              2. Eligibility
            </h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You must be at least 18 years of age</li>
              <li>You must be a current university student with a valid university email address</li>
              <li>You must provide accurate and truthful information</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              3. Waitlist
            </h2>
            <p>
              Joining the waitlist does not guarantee access to the Yuni app. Waitlist position indicates the order in which you signed up and may influence early access invitations. We reserve the right to modify the waitlist process at any time.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              4. User Conduct
            </h2>
            <p className="mb-3">When using Yuni, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Treat all users with respect and dignity</li>
              <li>Provide accurate profile information and photos</li>
              <li>Attend scheduled group dates or cancel with at least 24 hours notice</li>
              <li>Not engage in harassment, discrimination, or abusive behavior</li>
              <li>Not misrepresent your identity or university affiliation</li>
              <li>Not use the platform for commercial purposes or solicitation</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              5. No-Show Policy
            </h2>
            <p>
              Yuni operates on mutual respect for everyone&apos;s time. No-shows without 24+ hours notice result in escalating consequences: first offense receives a warning, second offense leads to a 2-week suspension, and third offense results in an account ban.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              6. Safety & Reporting
            </h2>
            <p>
              Users can report inappropriate behavior after any group date. Reports are reviewed by our team, and users who violate community standards may be suspended or permanently banned. Because accounts are tied to university emails, bans are meaningful and enforceable.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              7. Intellectual Property
            </h2>
            <p>
              The Yuni name, logo, and all associated content are the property of Yuni. You may not use our branding, design, or content without written permission.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              8. Limitation of Liability
            </h2>
            <p>
              Yuni facilitates group social experiences but is not responsible for the actions or conduct of individual users during dates. We encourage users to exercise good judgment and prioritize personal safety. Yuni is provided &quot;as is&quot; without warranties of any kind.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              9. Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of Yuni after changes constitutes acceptance of the new terms. We will notify users of significant changes via email.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              10. Contact
            </h2>
            <p>
              Questions about these terms? Contact us at{" "}
              <a href="mailto:hello@yunisocial.com" className="text-accent/70 hover:text-accent transition-colors">
                hello@yunisocial.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
