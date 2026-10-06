---
title: Dog Bowl Water Low Alarm
updated: 2026-10-06
---
- [ ] Wire HC-SR04 to Blue Pill (VCC to 5V, GND to GND, Trig to PB8, Echo to PB9)
- [ ] Wire active buzzer to PA1 (through optional 220Ω resistor) and GND
- [ ] Write firmware to measure distance, trigger buzzer when distance > threshold (e.g., 8 cm)
- [ ] Test on virtual board with sim_run
- [ ] Flash to real board via ST-Link
- [ ] Observe buzzer sound when water low
