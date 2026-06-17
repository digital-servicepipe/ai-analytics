import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#E3E3E3",
        muted: "#8E918F",
        panel: "#1E1F20",
        line: "rgba(255, 255, 255, 0.08)",
        surface: "#222327",
        app: "#0E0E0F",
        screen: "#1E1F20",
        sidebar: "#1E1F20",
        accent: "#2DD4BF",
        aqua: "#2DD4BF",
        violet: "#A78BFA",
      },
      boxShadow: {
        card: "0 18px 42px rgba(0, 0, 0, 0.24)",
        workspace: "0 28px 80px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
} satisfies Config;
