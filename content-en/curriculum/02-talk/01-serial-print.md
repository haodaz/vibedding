---
title: 2-1 Serial Print
goal: Watch the board print a counter line every second on your computer
hardware: Board, USB-to-serial adapter (CH340) or onboard serial
time: 45 minutes
status: todo
---
## What you're doing

```canvas
type: board
id: serial-count
goals: serial-lines:5
task: Print an incrementing count (0, 1, 2 …) over serial, one line per second
rubric: Uses Serial.begin; uses Serial.println; has a variable that increments; one line per second
---
#include <Arduino.h>

int counter = 0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  // print counter, then counter++, then wait 1 second
}
```

Wiring: board `TX` → serial module `RX`, board `RX` → serial module `TX`, and share `GND`. **TX goes to RX**, crossed over. This is the number one beginner mistake.

```canvas
type: wiring
title: USB-to-serial on UART1
left: bluepill
right: usb_serial
wires: bluepill.PA9 (TX) > usb_serial.RX #ffb454 "crossed!"; bluepill.PA10 (RX) > usb_serial.TX #39c5ff "crossed!"; bluepill.GND > usb_serial.GND #8b93a7 "common ground"
note: Don't connect the serial module's 5V/3.3V to the board (the board already has its own power). Set the module's jumper to 3.3V.
```


`Serial.println(counter++)`, then watch with `pio device monitor`.

## Checklist
- [ ] You see the count
- [ ] Deliberately set the wrong baud rate (115200 → 9600) and look at what garbage looks like. Next time you see garbage, you'll know what it is
