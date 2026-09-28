import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 平台从上一级的 content/ 目录读 markdown，所以要允许 vite 访问项目根目录
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, fs: { allow: ['..'] } },
})
