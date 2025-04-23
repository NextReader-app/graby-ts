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
    alias: {
      'graby-ts-site-config': resolve(__dirname, './src/tests/mocks/site-config.mock.ts'),
      'fontoxpath': resolve(__dirname, './src/tests/mocks/fontoxpath.mock.ts'),
      'dompurify': resolve(__dirname, './src/tests/mocks/dompurify.mock.ts'),
      '@mozilla/readability': resolve(__dirname, './src/tests/mocks/readability.mock.ts')
    }
  }
})