---
title: 0-1 装工具链
goal: 一条命令能编译出 .bin 文件
hardware: 不需要板子
time: 30 分钟
status: doing
---
## 要做什么

在 Mac 上装好嵌入式开发需要的工具。我们选 **PlatformIO**，原因：它是命令行工具，AI 可以直接帮你跑；它自动下载编译器和库；它支持几乎所有 STM32 板子。

不选 STM32CubeIDE，因为它是个巨大的图形界面，AI 看不见你在点什么，没法帮你。

## 步骤

```bash
bash tools/setup-mac.sh
```

装完检查：

```bash
bash tools/check-env.sh
```

然后试着编译第一个固件（这时候还不需要板子）：

```bash
cd firmware/01-blink && pio run
```

第一次会下载编译器和框架，大概几百 MB，耐心等。最后看到 `SUCCESS` 就算过关。

## 验收
- [ ] `pio --version` 有输出
- [ ] `pio run` 在 firmware/01-blink 里编译成功
- [ ] 能在 `.pio/build/bluepill/` 下找到 `firmware.bin`

## 问 AI 的时候
把报错**完整**复制给它，包括上面十几行。只贴最后一行 `error` 基本没用。见 [提示词库 · 报错求助模板](#/doc/prompts/02-debug-template.md)。

## 常见坑
- Python 版本太老（Mac 自带的 3.6 不行）
- `pio` 命令找不到：PATH 没加，重开终端
- 公司网络/代理导致下载失败：换手机热点试一次
