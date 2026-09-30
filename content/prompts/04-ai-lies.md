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
| 让用户撕杜邦线时叮嘱"小心别折断金属针"，实际那条是母对母根本没有针；用户拍照追问，又咬定"撕错了"。实际母对母正是接 I2C LCD 要用的。 | 杜邦线分公对公/公对母/母对母三种，套件里往往几条各一种；描述前先看照片或让用户看两头长什么样，不要默认某一种；被质疑时先查库和照片再下结论。 |

## 原则
AI 是一个读过所有手册但没摸过你这块板子的人。**它负责想，你负责测。**
