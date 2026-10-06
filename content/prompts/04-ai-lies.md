---
title: AI 在硬件上常犯的错
summary: 一份不断更新的清单。每次 AI 坑了你，就往这里加一条。
---
## 已知会错的地方
| AI 常见错误 | 怎么防 |
|---|---|
| 引脚号张冠李戴（把 UNO 的 13 号脚套到 STM32） | 永远说明板子型号，核对丝印 |
| 库名编造 / 版本不存在 | 去 registry.platformio.org 搜 |
| 蓝药丸 LED 说成高电平亮 | 实际是 PC13 低电平亮 |
| 把 HAL 和 Arduino 的函数混用 | 提问时说清框架 |
| 波特率、I2C 地址"想当然" | 用扫描程序/实测确认 |
| I incorrectly told the user the kit lacked a water detector and recommended buying a float switch before carefully checking the full kit photo. The kit visibly includes an HC-SR04 ultrasonic distance sensor. | Inspect the complete kit photo for usable sensing methods before recommending purchases; for bowl level, consider the HC-SR04 as a non-contact option and clearly explain its limitations. |
| 我根据库存名称把这块 LCD1602 当成了 I2C 版本；从用户照片看，它很可能是裸的 16 针并口 LCD，没有 PCF8574 转接板。 | 接线前先看实物背面和丝印：只有 VSS/VDD/VO/RS/RW/E/D0-D7 等 16 针的是并口版；有 PCF8574 小板和 GND/VCC/SDA/SCL 四针才是 I2C 版。 |
| **是平台让模型撒的谎**：体验模式下 `read_board` 直接吐仓库里的 `board.md`，于是任何访客一进来都被告知「你有一块 Freenove ESP32-WROVER，串口 /dev/cu.usbserial-210」——而他可能什么都没有。同时 `read_pinout` 永远给蓝药丸引脚，虚拟板子又按作者的档案画型号，三者互相打架。 | 凡是「用户自己的东西」（板子、库存、项目），体验模式下必须从访客自己的存储里读，不能拿作者的数据冒充。现在 `read_board` 没登记就老实说没有，并指示 AI 先问、或直接走虚拟板子；`read_pinout` 遇到非蓝药丸会拒答并指向 `read_board_profile`。这个洞只在别人来用时才暴露——自己用永远是对的。 |
| 排障时只给了板子 id（esp32_wrover）没给档案，模型把它说成「Waveshare ESP32-S3」、板载灯「通常在 GPIO0 或 GPIO1」、「GPIO2 留给 SD 卡」——全是编的，而且漏掉了真正的病根（这块板高电平才亮）。 | 凡是要模型判断引脚/电平的地方，必须把板子档案原文一起送过去，不能只给型号名。`diagnose` 现在强制带 `read_board_profile` 的结果，提示词里也写死「引脚和电平只能以档案为准，档案没写就说没写」。补上档案后它立刻改口并找对了方向。 |
| 让用户撕杜邦线时叮嘱"小心别折断金属针"，实际那条是母对母根本没有针；用户拍照追问，又咬定"撕错了"。实际母对母正是接 I2C LCD 要用的。 | 杜邦线分公对公/公对母/母对母三种，套件里往往几条各一种；描述前先看照片或让用户看两头长什么样，不要默认某一种；被质疑时先查库和照片再下结论。 |

## 原则
AI 是一个读过所有手册但没摸过你这块板子的人。**它负责想，你负责测。**
