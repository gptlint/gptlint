import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['bin/lint.ts', 'src/index.ts', 'rules/custom/index.ts'],
    publicDir: 'rules/custom',
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
