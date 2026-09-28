---
title: 2-1 串口打印
goal: 电脑上看到板子每秒打印一行计数
hardware: 板子、USB 转串口（CH340）或板载串口
time: 45 分钟
status: todo
---
## 要做什么

```canvas
type: board
id: serial-count
goals: serial-lines:5
task: 每秒在串口打印一行递增的计数（0, 1, 2 …）
rubric: 用了 Serial.begin；用了 Serial.println；有一个会自增的变量；每秒一行
---
#include <Arduino.h>

int counter = 0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  // 打印 counter，然后 counter++，然后等 1 秒
}
```

接线：板子 `TX` → 串口模块 `RX`，板子 `RX` → 串口模块 `TX`，`GND` 共地。**TX 接 RX**，交叉接，这是新手第一大坑。

`Serial.println(counter++)`，用 `pio device monitor` 看。

## 验收
- [ ] 看到计数
- [ ] 故意把波特率设错（115200 → 9600），看看乱码长什么样，以后见到乱码就知道是它
