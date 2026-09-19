import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssCodeSplit: true,
    target: "es2020",
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "router";
          if (id.includes("react-iconly")) return "icons";
          if (
            id.includes(`${"node_modules"}/react-dom`) ||
            id.includes(`${"node_modules"}/react/`) ||
            id.includes(`${"node_modules"}\\react-dom`) ||
            id.includes(`${"node_modules"}\\react\\`) ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "react-iconly"],
  },
});
