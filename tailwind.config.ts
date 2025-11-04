import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2B2539",
          foreground: "#F8F7F3",
        },
        secondary: {
          DEFAULT: "#BED3CC",
          foreground: "#2B2539",
        },
        warning: {
          DEFAULT: "#EEFFC8",
          foreground: "#2B2539",
        },
        danger: {
          DEFAULT: "#E7A0A0",
          foreground: "#2B2539",
        },
        muted: {
          DEFAULT: "#EBE9E4",
          foreground: "#5A5468",
        },
        accent: {
          DEFAULT: "#7B6767",
          foreground: "#F8F7F3",
        },
        brand: {
          slate: "#2B2539",
          oatmeal: "#EBE9E4",
          coral: "#EFC8C8",
          sea: "#BED3CC",
          umber: "#7B6767",
          chartreuse: "#EEFFC8",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
