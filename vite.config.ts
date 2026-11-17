pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { cliDiscoveryPlugin } from "../packages/wao-cli/discovery.mjs";

export default defineConfig({
  plugins: [react(), cliDiscoveryPlugin("wao-platform", process.env.VITE_FRONTEND_PREVIEW === "true" ? "preview" : "local")],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: process.env.VITE_FRONTEND_PREVIEW === "true" ? "/" : "./",
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
