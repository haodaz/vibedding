# compile-server · 云编译

网页版用户按下"烧录"时，代码发到这里编译，固件回到浏览器，浏览器用 Web Serial 烧进板子。

## 本地试跑
```bash
COMPILE_TOKEN=dev node compile-server/server.mjs
curl -s localhost:8080/health
```

## 部署（Railway 最省事）
1. Railway → New Project → Deploy from GitHub → 选 vibedding 仓库，**Root Directory 填 `compile-server`**（它会用这里的 Dockerfile）。
2. Variables：`COMPILE_TOKEN` 随便一串长密码。
3. 第一次构建要下载工具链（约 3 GB，10 分钟左右），之后每次编译几秒。
4. 拿到域名后，在 Vercel 加两个变量：`COMPILE_URL=https://xxx.up.railway.app`、`COMPILE_TOKEN=同上`。

Fly.io 同理：`fly launch --dockerfile Dockerfile`，内存给 1 GB。

## 接口
`POST /compile` `Authorization: Bearer <token>`
```json
{ "board": "bluepill", "files": { "src/main.cpp": "..." }, "lib_deps": ["adafruit/RTClib"] }
```
返回 `{ ok, images: [{ name, addr, size, b64 }], ram, flash, log, elapsed }`。ESP32 返回四段（bootloader / partitions / boot_app0 / firmware），STM32 一段（0x08000000）。
