// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/**/*.d.ts', 'dist/**', '**/vite/**', '*.config.js', '*.config.ts']
    },
    setupFiles: ['./vitest.setup.js'],
  }
})