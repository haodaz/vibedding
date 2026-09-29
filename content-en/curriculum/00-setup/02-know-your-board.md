---
title: 0-2 Get to Know Your Board
goal: Fill in content/hardware/board.md and know which pins the LED and serial port are on
hardware: Board, ST-Link, USB cable
time: 45 minutes
status: todo
---
## What you're doing

When the board arrives, don't rush to flash it. Spend 45 minutes figuring out what it is.

## Steps

Take a lap around this diagram first. Click the function buttons up top, like **UART** to see which two pins the serial port uses, or **SWD** to see where the programmer wires go. Hover over a pin for its description.

```canvas
type: pinout
```


1. **Find the part number**: read the text printed on the chip. Something like STM32F103C8T6, where every segment means something:
   - `STM32` a 32-bit chip from STMicroelectronics
   - `F1` the series (F1 entry-level, F4 performance, L low-power, H high-performance)
   - `03` sub-series
   - `C` pin count (C=48 pins, R=64, V=100)
   - `8` Flash size (8=64KB, B=128KB, E=512KB)
   - `T6` package and temperature range
2. **Have the AI decode it**: send the part number to the AI and have it explain each segment in the format above. Then **verify**: search the part number on st.com and check whether the official specs match what the AI said. This is your first practice at "don't blindly trust the AI."
3. **Find the onboard LED pin**: check the silkscreen on the back of the board, or search "your board name + schematic." Write it into `content/hardware/board.md`.
4. **Wiring**: connect four wires between the ST-Link and the board: `SWDIO`, `SWCLK`, `GND`, `3.3V`. Getting them backwards won't fry anything, it just won't connect. Take a photo and drop it in the hardware folder.

```canvas
type: wiring
title: ST-Link to Blue Pill (4-wire SWD)
left: stlink
right: bluepill
wires: stlink.SWDIO > bluepill.SWIO #ffb454 "data"; stlink.SWCLK > bluepill.SWCLK #39c5ff "clock"; stlink.GND > bluepill.GND #8b93a7; stlink.3.3V > bluepill.3.3 #ff5c5c "power (skip this wire if the board is plugged into USB)"
note: Every pin on the ST-Link's 10-pin header has a label printed next to it. Match the names. The Blue Pill's 4 SWD pins are on one of the short edges of the board.
```

5. **Plug it into the computer**:

```bash
bash tools/check-env.sh
```

Check whether ST-Link shows up in the USB section.

## Checklist
- [ ] board.md is filled in: chip part number, clock speed, Flash/RAM, onboard LED pin, onboard button pin (if any)
- [ ] check-env can see the ST-Link
- [ ] You can say what each of the four SWD wires does (one sentence each is fine)

## Common pitfalls
- You got a CH32 or a counterfeit chip (lots of cheap Blue Pills use clone chips, and flashing fails with "unknown chip id"). The fix is in the prompt library.
- ST-Link drivers: Macs usually don't need one. If it isn't recognized, swap the cable first (lots of cables are charge-only and don't carry data)
