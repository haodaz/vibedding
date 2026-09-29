---
title: 我的主板
board: esp32_wrover
summary: Freenove ESP32-WROVER（带摄像头），2026-09-29 到货。USB-C 直接烧录，不需要 ST-Link。
---
## 基本信息
| 项目 | 值 |
|---|---|
| 板子名称 | Freenove ESP32-WROVER Board（套件：Freenove Ultimate Starter Kit for ESP32-WROVER，带 OV2640 摄像头） |
| 芯片 | ESP32-WROVER 模组（ESP32-D0WD 双核 240MHz，4MB Flash，8MB PSRAM） |
| USB 转串口 | CH340（VID 1a86 / PID 7523），Mac 上是 `/dev/cu.usbserial-210` |
| 烧录方式 | USB-C 数据线直接烧（PlatformIO `esp-wrover-kit`；浏览器 esptool-js 也可以） |
| 供电 | USB 5V；板载 3.3V 稳压 |
| 扩展板 | 套件自带的黑色 GPIO 扩展板，把引脚引到带丝印的排针上 |

## 板载资源（待亲测核对）
| 资源 | 引脚 | 备注 |
|---|---|---|
| 摄像头 | 板上的 OV2640 排线 | 先不用 |
| 板载 LED | 待核对（很多 ESP32 板在 GPIO2） | 第一个程序会让 GPIO2 翻转，看板上有没有灯眨 |
| BOOT / EN 按键 | 板上两个小按钮 | 烧录时一般不用按（CH340 自动进烧录模式） |
| 串口 0 | USB 那路 | `Serial.begin(115200)` 直接用 |
| I2C | GPIO21 SDA / GPIO22 SCL（ESP32 默认） | LCD1602 I2C 接这里 |

## 注意
- 这块板不是 STM32。课程里"蓝药丸"的引脚（PC13、PA9 那些）在这块板上不存在，看 ESP32 的板子档案（知识库 → 板子）。
- ESP32 是 3.3V 逻辑，套件里 5V 的模块（超声波 HC-SR04 的 Echo）接进来要分压。

## 接线照片
（放到 content/hardware/ 目录）
