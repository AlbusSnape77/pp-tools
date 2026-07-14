import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/embed/index.jsx"),
      name: "PPToolsEmbed",
      formats: ["iife"],
      fileName: () => "pp-tools-embed.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: (asset) => asset.name?.endsWith(".css")
          ? "pp-tools-embed.css"
          : "assets/[name][extname]",
      },
    },
  },
});
