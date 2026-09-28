---
title: 1-1 自己写一遍 Blink
goal: 不看 firmware/01-blink，从空文件写出点灯程序
hardware: 板子
time: 30 分钟
status: todo
---
## 要做什么

就在下面这块虚拟板子上写。编辑器是空的，目标是让 PC13 每 200ms 翻转一次。写完点运行，跑几秒后点停止看目标检查；然后点 **✦ AI 评审** 让 AI 看看你写得对不对、为什么。

```canvas
type: board
id: my-blink
goals: pinmode:PC13, blink:PC13:200, no-warn
task: 从空文件写出 blink：让 PC13 上的板载 LED 每 200ms 翻转一次（亮 200ms、灭 200ms）
rubric: 用了 pinMode 把 PC13 设为 OUTPUT；用 digitalWrite + delay 实现翻转；周期约 200ms；知道蓝药丸 LED 是低电平点亮
---
#include <Arduino.h>

void setup() {
  // 在这里配置引脚
}

void loop() {
  // 在这里眨眼
}
```

LED 为什么要串电阻，自己拖一下就明白：

```canvas
type: led-circuit
```

新建 `firmware/02-my-blink`，从空的 `main.cpp` 开始，自己写 blink。允许问 AI，但**先让 AI 解释 `pinMode`、`digitalWrite`、`delay` 各干了什么，再要代码**。

## 延伸
- 让它按 SOS 的节奏眨（· · · — — — · · ·）
- 改成两个 LED 交替（需要外接一个 LED + 220Ω 电阻，长脚接 GPIO，短脚接电阻再接 GND）

```canvas
type: wiring
title: 外接一个 LED 到 PA1
left: bluepill
right: resistor_220, led_red
wires: bluepill.PA1 > resistor_220.一端 #39c5ff; resistor_220.另一端 > led_red.长脚(+) #ff5c5c "电阻串在哪一边都行"; led_red.短脚(-) > bluepill.GND #8b93a7
note: 这个外接 LED 是高电平点亮（和板载的 PC13 相反），digitalWrite(PA1, HIGH) 才亮。
```


## 验收
- [ ] 不看参考代码写出来的
- [ ] 能解释为什么 LED 要串电阻（问 AI，然后用一句话记在日志里）

## 顺便认一下电阻
套件里那一把色环电阻，拨一拨：

```canvas
type: resistor-color
```
