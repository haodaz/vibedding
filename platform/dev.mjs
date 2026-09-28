// 一条命令同时起网页和本地服务。 npm run dev
import { spawn } from 'node:child_process'
const server = spawn('node', ['server/index.mjs'], { stdio: 'inherit' })
const vite = spawn('npx', ['vite', ...process.argv.slice(2)], { stdio: 'inherit' })
const stop = () => { server.kill(); vite.kill(); process.exit() }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
vite.on('exit', stop)
