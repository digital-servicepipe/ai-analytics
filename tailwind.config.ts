import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#6b7280",
        panel: "#ffffff",
        line: "#e5e7eb",
        surface: "#f6f8fb",
        accent: "#3157d8",
        violet: "#7157d9",
      },
      boxShadow: {
        card: "0 12px 32px rgba(15, 23, 42, 0.07)",
      },
    },
  },
  plugins: [],
} satisfies Config;
