# Vibedding · Embedding your world with AI

门外汉 × AI 的嵌入式自学与动手平台 · https://www.vibedding.com

> 把门槛拆掉，让人专注宝贵的部分：实现自己的一个思路，对一件事大胆尝试，在一个原本无法掌握的领域做出点价值。
>
> 一个人，一块 STM32，一个 AI。边学边把过程铺成路，让下一个门外汉能照着走。

## 这是什么
两件事同时做：
1. **我在学嵌入式**。零基础，vibe coding 模式：目标驱动、AI 辅助、做出看得见的东西。
2. **我在把学的过程做成一个平台**。课程、日志、提示词、硬件笔记全部是 markdown，本地一个网页把它们串起来。学到哪，平台就长到哪。

## 目录
```
embeded/
├── content/            所有内容，全是 markdown，AI 和人都能直接读写
│   ├── curriculum/     课程：一个目录 = 一个模块，一个文件 = 一个任务
│   ├── journal/        学习日志，按天
│   ├── prompts/        提示词库：怎么向 AI 问硬件问题
│   └── hardware/       我的板子、套件、接线（只记亲测过的）
├── firmware/           固件项目，每个任务一个 PlatformIO 工程
├── platform/           本地网页（Vite + React），渲染 content/；内置实验台（虚拟板子、引脚图、电路小实验）
│   ├── src/canvases/   每种实验一个目录，注册在 index.tsx
│   └── server/         本地小服务：AI 评审、板子/工具链状态
├── tools/              脚本：装环境、体检、烧录、串口
└── docs/               平台自身的设计文档
```

## 线上体验
部署在 Vercel 的版本不需要安装任何东西：课程、实验台、知识库、虚拟板子、AI 出方案和采购清单都能用；真烧录要在本地模式。部署方法见 [docs/03-deploy.md](docs/03-deploy.md)。

## 跑起来
平台（只要有 Node）：
```bash
cd platform && npm install && npm run dev
```
打开 http://localhost:5173 。`npm run dev` 同时起网页和一个本地小服务（AI 评审、板子状态）。
AI 评审要密钥：把 `platform/.env.example` 复制成 `platform/.env` 填上 `ANTHROPIC_API_KEY`。不填也能用，会退化成"复制提示词自己去问"。
嵌入式工具链（板子到了再装）：
```bash
bash tools/setup-mac.sh
bash tools/check-env.sh
```
编译烧录第一个固件：
```bash
bash tools/flash.sh firmware/01-blink
```

## 两种用法
- **直接做**（导航第一项）：说一句"要有光"，AI 查引脚、写代码、在虚拟板子上跑、能烧就烧；它够不着的事（插线、按键、跑命令）弹指令卡请你配合。给不想学只想做成的人，也给有基础的人。
- **学习路径**：任务卡 + 实验台，自己动手。每张卡底部有"让 AI 来做"可以随时切过去。

## 怎么用这个平台学
1. 打开学习路径，挑一个任务
2. 做。卡住了用提示词库的模板问 AI
3. 做完把任务 md 里的 `status` 改成 `done`，在 journal/ 里写一篇日志
4. AI 说错的地方，记到 `prompts/04-ai-lies.md`

## 核心命题
门槛不在知识里，在知识之前：环境、终端、git、报错。详见 [docs/02-barrier-map.md](docs/02-barrier-map.md)。

## 设计原则
- **任务驱动**：每个任务结束时有看得见的东西（灯亮、屏幕出字），不是"学完第三章"
- **AI 是副驾驶不是自动驾驶**：每个任务都写明"先让 AI 解释，再要代码，再核对"
- **只记亲测**：硬件笔记不抄手册，只写自己验证过的
- **内容即代码**：全部 markdown + git，谁都能 fork 一份写自己的路
