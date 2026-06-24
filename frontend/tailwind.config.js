/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          950: "#0b1320",
          900: "#131f2e",
          800: "#1c2c40",
          700: "#283c54",
          600: "#3a5170",
          500: "#56708f",
          400: "#8198b1",
          300: "#aebed0",
          200: "#d3dce6",
          100: "#e9eef4",
          50: "#f4f7fa",
        },
        paper: {
          100: "#f7f9fc",
          200: "#eef3f8",
          300: "#dfe8f1",
        },
        iodine: {
          400: "#e8975a",
          500: "#d97b3f",
          600: "#bd6230",
          700: "#984c26",
        },
        glove: {
          400: "#45a392",
          500: "#2e7d6b",
          600: "#246357",
        },
        hazard: {
          400: "#de6754",
          500: "#c0432f",
          600: "#9c3525",
        },
        specimen: {
          400: "#e0ab2d",
          500: "#c2911a",
          600: "#9a7112",
        },
        cat: {
          chemical: "#c0432f",
          glassware: "#3a7ca5",
          consumable: "#6a4c93",
          bio: "#2e7d6b",
          equipment: "#b87f1c",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 19, 32, 0.06), 0 12px 30px -24px rgba(11, 19, 32, 0.35)",
        popover: "0 24px 60px -18px rgba(11, 19, 32, 0.28), 0 8px 24px -12px rgba(11, 19, 32, 0.18)",
        glow: "0 18px 60px -28px rgba(46, 125, 107, 0.55)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.25s ease-out",
        shimmer: "shimmer 1.3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
