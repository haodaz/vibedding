---
title: 0-2 认识你的板子
goal: 填好 content/hardware/board.md，知道 LED 和串口在哪个脚
hardware: 板子、ST-Link、数据线
time: 45 分钟
status: todo
---
## 要做什么

拿到板子先别急着烧程序。花 45 分钟搞清楚它是谁。

## 步骤

先在这张图上转一圈。点上面的功能按钮，比如点 **UART** 看串口在哪两个脚，点 **SWD** 看烧录线接哪。悬停引脚看说明。

```canvas
type: pinout
```


1. **找型号**：看芯片上印的字。STM32F103C8T6 这种，每一段都有含义：
   - `STM32` 意法半导体的 32 位芯片
   - `F1` 系列（F1 入门、F4 性能、L 低功耗、H 高性能）
   - `03` 子系列
   - `C` 引脚数（C=48 脚，R=64，V=100）
   - `8` Flash 大小（8=64KB，B=128KB，E=512KB）
   - `T6` 封装和温度范围
2. **让 AI 帮你解读**：把型号发给 AI，让它按上面的格式解释一遍。然后**核对**：去 st.com 搜型号，看官方页面的参数是不是和 AI 说的一致。这是你第一次练习"不盲信 AI"。
3. **找板载 LED 的引脚**：看板子背面丝印，或者搜"你的板子名 + schematic"。写进 `content/hardware/board.md`。
4. **接线**：ST-Link 和板子接四根线：`SWDIO`、`SWCLK`、`GND`、`3.3V`。接反不会炸，但不通。拍张照放进 hardware 目录。

```canvas
type: wiring
title: ST-Link 接蓝药丸（SWD 四根线）
left: stlink
right: bluepill
wires: stlink.SWDIO > bluepill.SWIO #ffb454 "数据"; stlink.SWCLK > bluepill.SWCLK #39c5ff "时钟"; stlink.GND > bluepill.GND #8b93a7; stlink.3.3V > bluepill.3.3 #ff5c5c "供电（板子接了 USB 就不要接这根）"
note: ST-Link 的 10 针口上每个脚旁边有丝印，对着名字接。蓝药丸的 SWD 四针在板子短边一端。
```

5. **插上电脑**：

```bash
bash tools/check-env.sh
```

看 USB 那一栏有没有出现 ST-Link。

## 验收
- [ ] board.md 里填了：芯片型号、主频、Flash/RAM、板载 LED 引脚、板载按键引脚（如果有）
- [ ] check-env 能看到 ST-Link
- [ ] 能说出 SWD 四根线各是干什么的（一句话就行）

## 常见坑
- 买到的是 CH32 或者假芯片（很多便宜的蓝药丸是克隆芯片，烧录时会报 "unknown chip id"）。解决办法在提示词库里有。
- ST-Link 驱动：Mac 一般不需要装驱动，识别不了先换线（很多线只能充电不能传数据）
