/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
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
