---
title: 5-2 直接操作寄存器点灯
goal: 不用任何库，对着参考手册写 blink
hardware: 板子、RM0008 参考手册（PDF）
time: 3 小时
status: todo
---
`RCC->APB2ENR |= ...`、`GPIOC->CRH = ...`。这个任务的重点不是代码，是**学会在 1000 多页的参考手册里找到你要的那一页**。让 AI 告诉你去哪一章找，然后自己翻。
