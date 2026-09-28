# Embeded 项目说明（给 AI 看）

这是一个嵌入式自学 + 学习平台项目。用户是零基础门外汉，用中文交流。

## 结构
- `content/` 全部 markdown，frontmatter 用极简 `key: value`，不要用嵌套 YAML
  - 课程任务 frontmatter 字段：`title, goal, hardware, time, status(todo|doing|done)`
  - 模块说明是目录下的 `index.md`，字段：`title, summary`
  - 日志字段：`title, date, mood, summary`
- `firmware/` 每个 PlatformIO 工程独立，`platformio.ini` 里多 env 对应不同板子
- `platform/` Vite + React + TS，`src/content.ts` 用 import.meta.glob 读 `../../content/**/*.md`，hash 路由

## Canvas（实验）
- 任务卡里 ```canvas 代码块嵌实验，属性 `key: value`，`---` 后是初始代码。类型见 `platform/src/canvases/index.tsx`
- `board` 的 goals 检查器在 `canvases/board/goals.ts`；模拟器只支持 Arduino 教学子集，见 `transpile.ts` 顶部注释
- 新加 canvas：写组件 + 在 index.tsx 注册 + CANVAS_META 加一行

## 直接做（agent）
- 入口 `#/make`，代码在 `platform/src/workshop/`。循环在浏览器里跑：`/api/agent/step` 调一次模型，服务端工具走 `/api/tool`，`sim_run` 和 `ask_human` 在浏览器执行
- 工具定义在 `platform/server/tools.mjs`，系统提示在 `agent.mjs`。写文件只允许 firmware/、content/journal、content/hardware
- 模型提供方由 `platform/.env` 决定：有 OPENAI_API_KEY 走 OpenAI Responses API（默认 gpt-5.6-luna），否则 ANTHROPIC_API_KEY 走 Claude，都没有用 `mock.mjs` 的剧本演示。`AGENT_PROVIDER` / `AGENT_MODEL` 可覆盖
- 元件知识库 `content/hardware/parts-catalog.json`（AI 可 add_part 收录，只收电子件）；库存 `content/hardware/inventory.json`（聊天中 update_inventory 慢慢攒）；项目 `content/projects/<slug>/{brief,bom,plan}.md`
- 对话存在浏览器 localStorage（ws:session），"新对话"清空
- 引脚数据的唯一来源是 `content/hardware/bluepill-pins.json`（平台引脚图和 read_pinout 工具共用）

## 约定
- 教学口吻：讲人话，先比喻再术语，每个新概念都写"常见坑"
- 给出引脚号、库名、寄存器名时，提醒用户核对，不要装作确定
- 任务完成后：改 status → 写日志 → 若 AI 出错记入 `content/prompts/04-ai-lies.md`
- 本地能跑是底线。平台 `cd platform && npm run dev`；固件 `pio run`
- 板子型号在 `content/hardware/board.md`，未填之前默认按 STM32F103C8T6 蓝药丸假设并说明
