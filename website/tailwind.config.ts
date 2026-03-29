import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#241C1A",
        foreground: "#ffffff",
        accent: "#C40018",
        ember: "#E55A2B",
        firelight: "#F2B34C",
        coal: "#241C1A",
        cream: "#F7F0E7",
        muted: "#a0a0a0",
        "input-border": "#3a2e2a",
        "input-focus": "#4a3e3a",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      letterSpacing: {
        cinematic: "0.15em",
        wide: "0.08em",
      },
    },
  },
  plugins: [],
};
export default config;
