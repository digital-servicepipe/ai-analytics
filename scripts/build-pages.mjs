import react from "@vitejs/plugin-react";
import { build } from "vite";

await build({
  configFile: false,
  base: "/ai-analytics/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
