/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "localhost",
    port: 5173,

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },

  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "frontend",
          environment: "jsdom",
          globals: true,
          include: ["src/tests/**/*.test.{js,jsx}"],
          setupFiles: ["./src/tests/setup.js"],
        },
      },
    ],
  },
});