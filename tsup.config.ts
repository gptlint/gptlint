import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['bin/gptlint.ts', 'src/index.ts', 'rules/custom/index.ts'],
    outDir: 'dist',
    target: 'node16',
    platform: 'node',
    format: ['esm'],
    splitting: false,
    sourcemap: true,
    minify: false,
    shims: true,
    dts: true
  }
])
