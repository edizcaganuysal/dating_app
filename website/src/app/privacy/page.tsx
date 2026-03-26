import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Yuni",
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-white/40 text-sm mb-16">
          Last updated: March 2026
        </p>

        <div className="space-y-10 text-white/60 text-sm leading-relaxed font-light">
          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              1. Information We Collect
            </h2>
            <p className="mb-3">
              When you join the Yuni waitlist, we collect:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your full name</li>
              <li>Your university email address</li>
              <li>Your university name</li>
            </ul>
            <p className="mt-3">
              When the app launches and you create an account, we may additionally collect profile information, photos, location data, and usage data necessary to provide our matching and dating services.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>To manage your waitlist position and communicate launch updates</li>
              <li>To verify your university affiliation</li>
              <li>To provide, improve, and personalize our services when the app launches</li>
              <li>To facilitate group matching and dating experiences</li>
              <li>To ensure safety and prevent misuse of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              3. Data Storage & Security
            </h2>
            <p>
              Your data is stored securely using industry-standard encryption. We use PostgreSQL databases hosted on secure cloud infrastructure. Access to personal data is restricted to authorized team members only. We do not sell, rent, or share your personal information with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              4. Your Private Preferences
            </h2>
            <p>
              Yuni takes your privacy seriously. Your private preferences — including age range, dealbreakers, and attraction preferences — are <strong className="text-white/80">never</strong> shared with or visible to other users. These are used exclusively by our matching algorithm to build compatible groups.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              5. Data Retention
            </h2>
            <p>
              Waitlist data is retained until the app launches and you either create an account or request deletion. You may request removal from the waitlist at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              6. Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-light tracking-wide text-white/80 mb-4">
              7. Contact Us
            </h2>
            <p>
              For privacy-related inquiries or to exercise your rights, contact us at{" "}
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
