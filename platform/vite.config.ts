import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 平台从上一级的 content/ 目录读 markdown，所以要允许 vite 访问项目根目录。
// /api 转发到本地小服务（server/index.mjs，端口 5174）。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://127.0.0.1:5174' },   // 用 127.0.0.1：这台 Mac 上 localhost 解析有 6 秒延迟
  },
  preview: { port: 4173, proxy: {} },   // 预览 = 纯静态，不代理 /api，用来模拟线上体验模式
  worker: { format: 'es' },
})
