---
title: 2-2 从电脑发命令
goal: 在电脑上输 on/off，板子的灯跟着变
hardware: 同上
time: 1 小时
status: todo
---
## 要做什么

下面串口监视器底部那个输入框，就是"电脑发给板子"。输入 `on` 回车试试。

```canvas
type: board
id: serial-cmd
goals: pinmode:PC13, serial
task: 从串口收一行命令：on 点亮 LED，off 熄灭，其他回复 unknown
rubric: 用 Serial.available 判断有没有数据；用 readStringUntil 读一行；比较字符串；回复确认
---
#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
  digitalWrite(PC13, HIGH);
  Serial.begin(115200);
  Serial.println("ready. type on / off");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    // if (cmd == "on") ...
  }
}
```

`Serial.available()`、`Serial.readStringUntil('\n')`。做一个极简的命令行。

## 延伸
加一个 `blink 200` 命令，设置眨眼周期。你会发现 `delay` 让板子在眨眼时收不到命令。这个痛点留给模块 4。
