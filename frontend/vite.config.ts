import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "."), "");
  const glbUrl = (env.VITE_TURBINE_GLB_URL ?? "").trim();

  const proxy: Record<string, import("vite").ProxyOptions> = {};
  if (mode === "development" && /^https?:\/\//i.test(glbUrl)) {
    try {
      const u = new URL(glbUrl);
      proxy["/__turbine-glb"] = {
        target: `${u.protocol}//${u.host}`,
        changeOrigin: true,
        secure: true,
        rewrite: () => `${u.pathname}${u.search}`,
      };
    } catch {
      /* bad VITE_TURBINE_GLB_URL */
    }
  }

  return {
    plugins: [react()],
    server: {
      host: true,
      strictPort: true,
      proxy,
      watch: {
        // Default: use native FS events (lower CPU).
        // If file changes aren't detected (VM/WSL/network drive), run with:
        //   VITE_USE_POLLING=true npm run dev
        usePolling: process.env.VITE_USE_POLLING === "true",
        interval: 300,
        ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
