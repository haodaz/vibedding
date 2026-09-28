---
title: 1-2 按键控制 LED
goal: 按下亮、松开灭；然后改成按一下切换
hardware: 板子、按键（或板载按键）、杜邦线
time: 1 小时
status: todo
---
## 要做什么

先弄懂"上拉"是什么。按住下面的按钮看引脚读到什么，再把上拉关掉试试：

```canvas
type: pullup
```

然后在虚拟板子上写：板子右下角那个黄色按钮接在 **PA0** 和 GND 之间，按住它等于把 PA0 接地。

真接线是这样（用内部上拉，不需要外接电阻）：

```canvas
type: wiring
title: 按键接 PA0
left: bluepill
right: button
wires: bluepill.PA0 > button.脚1 #ffb454; bluepill.GND > button.脚2 #8b93a7
note: 轻触按键四个脚，同一侧的两个脚本来就是通的。接对角线的两个脚最保险。
```


```canvas
type: board
id: button
goals: input:PA0, pinmode:PC13, no-warn
task: 按住按键（PA0，接地）LED 亮，松开灭。进阶：按一下切换亮灭，且不会乱跳（去抖）
rubric: PA0 配成 INPUT_PULLUP；用 digitalRead 读按键；理解按下是 0；进阶版有去抖处理
---
#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
  pinMode(PA0, INPUT_PULLUP);   // 内部上拉：没按是 1，按下是 0
}

void loop() {
  int pressed = digitalRead(PA0) == LOW;
  digitalWrite(PC13, pressed ? LOW : HIGH);   // 低电平亮
}
```

第一次**读**引脚。学 `INPUT_PULLUP`、`digitalRead`。

## 你会撞上的墙
按一下切换状态时，会发现有时候按一次跳两次。这叫**按键抖动**，是每个嵌入式人的成人礼。让 AI 解释"debounce"，然后自己实现一个。

## 验收
- [ ] 按住亮松开灭
- [ ] 按一下切换，且不会乱跳
- [ ] 日志里写下你对"上拉电阻"的理解
