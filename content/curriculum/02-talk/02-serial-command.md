---
title: 2-2 从电脑发命令
goal: 在电脑上输 on/off，板子的灯跟着变
hardware: 同上
time: 1 小时
status: todo
---
## 要做什么
`Serial.available()`、`Serial.readStringUntil('\n')`。做一个极简的命令行。

## 延伸
加一个 `blink 200` 命令，设置眨眼周期。你会发现 `delay` 让板子在眨眼时收不到命令。这个痛点留给模块 4。
