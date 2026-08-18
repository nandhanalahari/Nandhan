import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // the native fsevents watcher has been silently dropping changes on
      // this machine, leaving the dev server serving stale modules
      usePolling: true,
      interval: 300,
    },
  },
})
