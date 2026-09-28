---
title: 1-3 呼吸灯
goal: LED 平滑地亮起来再暗下去
hardware: 板子
time: 45 分钟
status: todo
---
## 要做什么

```canvas
type: board
id: breathe
goals: pinmode:PC13, pwm:PC13
task: 用 analogWrite 让 PC13 的 LED 平滑地从暗到亮再到暗（呼吸灯）
rubric: 用了 analogWrite；亮度是渐变的，不是跳的；能解释占空比
---
#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
}

void loop() {
  // 提示：for 循环从 0 到 255，每步 analogWrite(PC13, i); delay(5);
  // 再从 255 回到 0
}
```

数字引脚只有 0 和 1，怎么做出"半亮"？答案是 **PWM**：快速开关，用"开的时间占比"骗过眼睛。

用 `analogWrite` 实现呼吸灯。然后问 AI：为什么不是所有引脚都能 PWM？这会把你引向"定时器"这个概念，模块 4 见。

## 验收
- [ ] 呼吸效果
- [ ] 能用一句话解释 PWM 的"占空比"
