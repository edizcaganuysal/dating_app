import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Yuni | The Group Dating App for University Students",
  description:
    "The group dating app for university students. Join the waitlist and be the first to know when Yuni launches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#241C1A]" style={{ background: "#241C1A" }}>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-body antialiased bg-background text-foreground`}
        style={{ background: "#241C1A", color: "#ffffff", margin: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
