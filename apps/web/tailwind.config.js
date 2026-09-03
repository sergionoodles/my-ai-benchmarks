/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesk"', "ui-sans-serif", "sans-serif"],
        sans: ['"Instrument Sans"', "ui-sans-serif", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        punch: "10px 10px 0 0 hsl(var(--accent))",
        glow: "0 0 80px -12px hsl(var(--primary) / 0.55)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(28px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        grow: {
          from: { width: "0%" },
          to: { width: "var(--bar)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-4%, 3%, 0) scale(1.08)" },
        },
        strike: {
          from: { transform: "scaleX(0) rotate(-8deg)" },
          to: { transform: "scaleX(1) rotate(-8deg)" },
        },
      },
      animation: {
        rise: "rise 0.85s cubic-bezier(0.16, 1, 0.3, 1) both",
        grow: "grow 1.1s cubic-bezier(0.16, 1, 0.3, 1) both",
        marquee: "marquee 32s linear infinite",
        drift: "drift 16s ease-in-out infinite",
        strike: "strike 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both",
      },
    },
  },
  plugins: [],
};
