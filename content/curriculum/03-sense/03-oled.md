---
title: 3-3 OLED 显示屏
goal: 屏幕上显示温度和一个跳动的心
hardware: 0.96 寸 I2C OLED（SSD1306）
time: 1.5 小时
status: todo
---
第一次用 **I2C 总线**：两根线（SCL、SDA）挂多个设备，靠地址区分。先用 I2C 扫描程序找到屏幕地址（通常 0x3C），再上 u8g2 或 Adafruit_SSD1306 库。

```canvas
type: wiring
title: OLED 接 I2C1
left: bluepill
right: oled
wires: bluepill.PB6 > oled.SCL #39c5ff "时钟"; bluepill.PB7 > oled.SDA #3ddc84 "数据"; bluepill.3.3 > oled.VCC #ff5c5c; bluepill.GND > oled.GND #8b93a7
note: I2C 只要两根信号线。屏幕背面丝印的引脚顺序各家不一样（有的是 GND VCC SCL SDA，有的是 VCC GND），接之前看一眼。
```

