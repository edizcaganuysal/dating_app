import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Yuni — The Group Dating App for University Students",
  description:
    "Stop swiping. Start meeting. Yuni matches university students into groups of 4-6 for real activities with real people from your campus. Join the waitlist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth bg-[#F7F0E7]" style={{ background: "#F7F0E7" }}>
      <body
        className={`${inter.variable} ${playfair.variable} font-body antialiased bg-background text-foreground`}
        style={{ background: "#F7F0E7", color: "#241C1A", margin: 0 }}
      >
        {children}
      </body>
    </html>
  );
}
