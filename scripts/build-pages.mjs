import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await build({
  configFile: false,
  root: projectRoot,
  base: "/ai-analytics/",
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(projectRoot, "index.html"),
    },
  },
});
