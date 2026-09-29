---
title: 3-3 OLED Display
goal: Show the temperature and a beating heart on the screen
hardware: 0.96-inch I2C OLED (SSD1306)
time: 1.5 hours
status: todo
---
Your first time on the **I2C bus**: two wires (SCL, SDA) carry multiple devices, told apart by address. First run an I2C scanner program to find the screen's address (usually 0x3C), then bring in the u8g2 or Adafruit_SSD1306 library.

```canvas
type: wiring
title: OLED on I2C1
left: bluepill
right: oled
wires: bluepill.PB6 > oled.SCL #39c5ff "clock"; bluepill.PB7 > oled.SDA #3ddc84 "data"; bluepill.3.3 > oled.VCC #ff5c5c; bluepill.GND > oled.GND #8b93a7
note: I2C only needs two signal wires. The pin order printed on the back of the screen varies by manufacturer (some are GND VCC SCL SDA, some are VCC GND), so look before you wire.
```

