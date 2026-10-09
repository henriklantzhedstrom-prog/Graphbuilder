/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  // VITE_SINGLE_FILE=1 bäddar in all kod och stil i index.html (för publicering som en enda sida).
  plugins: [react(), tailwindcss(), ...(process.env.VITE_SINGLE_FILE ? [viteSingleFile()] : [])],
  build: {
    chunkSizeWarningLimit: 1000,
    // Stabila filnamn för den publicerade sidan så att samma länk kan uppdateras med ny version.
    ...(process.env.VITE_STABLE_ASSETS
      ? {
          rolldownOptions: {
            output: {
              entryFileNames: "assets/app.js",
              chunkFileNames: "assets/[name].js",
              assetFileNames: "assets/[name][extname]",
            },
          },
        }
      : {}),
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
  },
});
