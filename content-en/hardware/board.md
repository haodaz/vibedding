---
title: My Board
board: esp32_wrover
summary: Freenove ESP32-WROVER (with camera), arrived 2026-09-29. Flashes straight over USB-C, no ST-Link needed.
---
## Basics
| Item | Value |
|---|---|
| Board name | Freenove ESP32-WROVER Board (kit: Freenove Ultimate Starter Kit for ESP32-WROVER, with OV2640 camera) |
| Chip | ESP32-WROVER module (ESP32-D0WD dual-core 240 MHz, 4 MB flash, 8 MB PSRAM) |
| USB to serial | CH340 (VID 1a86 / PID 7523), shows up on the Mac as `/dev/cu.usbserial-210` |
| Flashing | Straight over a USB-C data cable (PlatformIO `esp-wrover-kit`; esptool-js in the browser also works). Use upload_speed = 115200 |
| Power | USB 5 V; onboard 3.3 V regulator |
| Expansion board | The black GPIO breakout that comes with the kit; brings every pin out to a labelled header |

## Onboard resources
| Resource | Pin | Notes |
|---|---|---|
| Camera | The OV2640 ribbon on the board | Not used yet |
| Onboard LED | GPIO2, active-high | Confirmed: the first program blinked it |
| BOOT / EN buttons | The two small buttons on the board | Normally not needed while flashing (CH340 enters bootloader automatically) |
| Serial 0 | The USB one | `Serial.begin(115200)` works directly |
| I2C | GPIO21 SDA / GPIO22 SCL (ESP32 default) | LCD1602 I2C goes here |

## Notes
- This is not an STM32. Blue Pill pins from the course (PC13, PA9 and so on) do not exist here; see the ESP32 board profile (Knowledge → Boards).
- The ESP32 is 3.3 V logic. 5 V modules from the kit (the HC-SR04 Echo pin, for example) need a voltage divider on the way in.

## Wiring photos
(Put them in the content/hardware/ folder)
