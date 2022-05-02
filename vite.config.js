import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteSentry from 'vite-plugin-sentry'

const plugins = [vue()];

if (process.env.VITE_SENTRY_DSN) {
  const sentryConfig  = {
    authToken: process.env.VITE_SENTRY_DSN,
    org: 'ryan-scarbery',
    project: 'pdx-shootings',
    deploy: {
      env: 'production'
    },
    setCommits: {
      auto: true
    },
    sourceMaps: {
      include: ['./dist/assets'],
    }
  }
  plugins.push(viteSentry(sentryConfig))
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins,
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
