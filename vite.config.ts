import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/ai-analytics/" : "/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5177,
  },
  preview: {
    host: "0.0.0.0",
    port: 5177,
  },
}));
