import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'  // <— works everywhere

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    strictPort: true,
    watch: {
      // Default: use native FS events (lower CPU).
      // If file changes aren't detected (VM/WSL/network drive), run with:
      //   VITE_USE_POLLING=true npm run dev
      usePolling: process.env.VITE_USE_POLLING === 'true',
      interval: 300,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
