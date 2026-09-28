---
title: 1-1 自己写一遍 Blink
goal: 不看 firmware/01-blink，从空文件写出点灯程序
hardware: 板子
time: 30 分钟
status: todo
---
## 要做什么
新建 `firmware/02-my-blink`，从空的 `main.cpp` 开始，自己写 blink。允许问 AI，但**先让 AI 解释 `pinMode`、`digitalWrite`、`delay` 各干了什么，再要代码**。

## 延伸
- 让它按 SOS 的节奏眨（· · · — — — · · ·）
- 改成两个 LED 交替（需要外接一个 LED + 220Ω 电阻，长脚接 GPIO，短脚接电阻再接 GND）

## 验收
- [ ] 不看参考代码写出来的
- [ ] 能解释为什么 LED 要串电阻（问 AI，然后用一句话记在日志里）
