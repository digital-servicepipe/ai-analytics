import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#F4F7FB",
        muted: "#99A9BD",
        panel: "#121923",
        line: "#2A3443",
        surface: "#19212E",
        app: "#0B1118",
        screen: "#0E151E",
        sidebar: "#0F151F",
        accent: "#79A9FF",
        aqua: "#55D4C3",
        violet: "#B79DFF",
      },
      boxShadow: {
        card: "0 18px 42px rgba(0, 0, 0, 0.24)",
        workspace: "0 28px 80px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
} satisfies Config;
