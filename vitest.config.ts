import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Logique pure testable sans Electron ni interface
      include: ['src/renderer/src/lib/**/*.ts', 'src/shared/**/*.ts', 'src/main/services/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/shared/types/**', 'src/shared/constants/**']
    }
  }
})
