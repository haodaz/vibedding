---
title: 0-3 第一次烧录
goal: 板载 LED 眨眼，串口打出 hello from stm32
hardware: 板子、ST-Link
time: 30 分钟
status: done
---
## 要做什么

真板子没到之前，先在这块虚拟板子上"烧"一次，熟悉一下：点 **▶ 烧录并运行**，看灯眨、看串口出字，再点 **■ 停止** 看目标检查。这里跑的就是 `firmware/01-blink/src/main.cpp` 的代码。

```canvas
type: board
id: first-flash
goals: pinmode:PC13, blink:PC13:500, serial:hello from stm32
task: 把 firmware/01-blink 原样跑起来：PC13 每 500ms 翻转，串口打印 hello from stm32
rubric: 有 pinMode(PC13, OUTPUT)；LED 周期约 1 秒；串口能看到 hello from stm32
---
#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
  Serial.begin(115200);
  Serial.println("hello from stm32");
}

void loop() {
  digitalWrite(PC13, LOW);   // 蓝药丸的 LED 是低电平点亮
  delay(500);
  digitalWrite(PC13, HIGH);
  delay(500);
}
```


把 `firmware/01-blink` 烧进去。这一步不改代码，只走通链路。

## 步骤

1. 确认 `firmware/01-blink/platformio.ini` 里 `default_envs` 选的是你的板子，`LED_PIN` 是你在 0-2 里查到的引脚。
2. 烧录：

```bash
bash tools/flash.sh firmware/01-blink
```

3. 灯该眨了。如果没眨，先别慌，去看"常见坑"。
4. 看串口（如果你的板子有 USB 转串口，或者你接了 CH340 模块）：

```bash
bash tools/monitor.sh
```

按板子上的 RESET，应该看到 `hello from stm32`。

## 验收
- [ ] LED 以 1 秒周期眨
- [ ] 改 `delay(500)` 为 `delay(100)`，重新烧，眨得更快了 —— 这证明跑的是**你的**代码
- [ ] 在日志里写下今天的感受

## 常见坑
| 现象 | 大概率原因 |
|---|---|
| `Error: open failed` / 找不到 ST-Link | 线不传数据、SWD 接线松、ST-Link 假货固件问题 |
| `unknown chip id` | 克隆芯片。给 openocd 加 `set CPUTAPID 0`，问 AI 怎么加 |
| 烧录成功但灯不亮 | LED_PIN 写错，或者这个板子的 LED 是高电平亮，把 LOW/HIGH 换一下 |
| 灯亮但不眨 | 上次的程序还在跑，烧录其实失败了，看输出有没有 SUCCESS |
