import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette NidLocal
        brand: {
          50: "#f0f9f4",
          100: "#dcf0e4",
          200: "#bbe2cc",
          300: "#8acbab",
          400: "#56ad84",
          500: "#339168",  // Vert principal
          600: "#247352",
          700: "#1e5c43",
          800: "#1a4937",
          900: "#163c2e",
          950: "#0b2219",
        },
        sand: {
          50: "#fdfaf5",
          100: "#faf3e7",
          200: "#f3e4ca",
          300: "#e9d0a5",
          400: "#ddb87a",
          500: "#d4a35a",
          600: "#c58c47",
          700: "#a4713b",
          800: "#845b33",
          900: "#6c4b2c",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.12), 0 2px 4px -2px rgb(0 0 0 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
