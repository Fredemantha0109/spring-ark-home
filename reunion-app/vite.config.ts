import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://fredemantha0109.github.io/spring-ark-home/reunion/
// ビルド成果物はリポジトリ直下の reunion/ に出力する。
// reunion/data/*.json が実データの置き場所なので emptyOutDir は false、
// publicDir も false にして data/ を上書きしないようにしている。
export default defineConfig({
  base: '/spring-ark-home/reunion/',
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: '../reunion',
    emptyOutDir: false,
  },
})
