---
title: 0-3 Your First Flash
goal: The onboard LED blinks and the serial port prints hello from stm32
hardware: Board, ST-Link
time: 30 minutes
status: todo
---
## What you're doing

Before the real board arrives, "flash" this virtual board once to get the feel of it: click **▶ Flash & Run**, watch the LED blink and text show up on the serial monitor, then click **■ Stop** to see the goal check. The code running here is `firmware/01-blink/src/main.cpp`.

```canvas
type: board
id: first-flash
goals: pinmode:PC13, blink:PC13:500, serial:hello from stm32
task: Run firmware/01-blink as-is: toggle PC13 every 500ms and print hello from stm32 over serial
rubric: Has pinMode(PC13, OUTPUT); LED period is about 1 second; hello from stm32 appears on serial
---
#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
  Serial.begin(115200);
  Serial.println("hello from stm32");
}

void loop() {
  digitalWrite(PC13, LOW);   // the Blue Pill's LED is active-low (LOW turns it on)
  delay(500);
  digitalWrite(PC13, HIGH);
  delay(500);
}
```


Flash `firmware/01-blink` onto the board. No code changes in this step, you're just proving the pipeline works end to end.

## Steps

1. Confirm that `default_envs` in `firmware/01-blink/platformio.ini` matches your board, and `LED_PIN` is the pin you found in 0-2.
2. Flash:

```bash
bash tools/flash.sh firmware/01-blink
```

3. The LED should be blinking. If it isn't, don't panic. Go check "Common pitfalls."
4. Watch the serial output (if your board has USB-to-serial, or you've connected a CH340 module):

```bash
bash tools/monitor.sh
```

Press RESET on the board. You should see `hello from stm32`.

## Checklist
- [ ] LED blinks with a 1-second period
- [ ] Change `delay(500)` to `delay(100)`, re-flash, and it blinks faster. This proves the board is running **your** code
- [ ] Write down how today felt in your journal

## Common pitfalls
| Symptom | Most likely cause |
|---|---|
| `Error: open failed` / ST-Link not found | Charge-only cable, loose SWD wiring, counterfeit ST-Link firmware issue |
| `unknown chip id` | Clone chip. Add `set CPUTAPID 0` to openocd; ask the AI how |
| Flash succeeds but LED stays off | Wrong LED_PIN, or this board's LED is active-high; swap LOW/HIGH |
| LED on but not blinking | The previous program is still running; the flash actually failed. Check the output for SUCCESS |
