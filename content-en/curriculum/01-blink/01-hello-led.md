---
title: 1-1 Write Blink Yourself
goal: Write an LED blink program from an empty file, without looking at firmware/01-blink
hardware: Board
time: 30 minutes
status: todo
---
## What you're doing

Write it right here on the virtual board below. The editor is empty. The goal is to toggle PC13 every 200ms. When you're done, click run, let it go a few seconds, then click stop to see the goal check. Then click **✦ AI Review** to have the AI look at whether you got it right, and why.

```canvas
type: board
id: my-blink
goals: pinmode:PC13, blink:PC13:200, no-warn
task: Write blink from an empty file: toggle the onboard LED on PC13 every 200ms (on 200ms, off 200ms)
rubric: Uses pinMode to set PC13 as OUTPUT; toggles with digitalWrite + delay; period is about 200ms; knows the Blue Pill LED is active-low
---
#include <Arduino.h>

void setup() {
  // configure the pin here
}

void loop() {
  // blink here
}
```

Why does an LED need a resistor in series? Drag the slider and see for yourself:

```canvas
type: led-circuit
```

Create `firmware/02-my-blink`, start from an empty `main.cpp`, and write blink yourself. You're allowed to ask the AI, but **first have it explain what `pinMode`, `digitalWrite`, and `delay` each do, and only then ask for code**.

## Going further
- Make it blink in SOS rhythm (· · · — — — · · ·)
- Make two LEDs alternate (needs an external LED + 220Ω resistor: long leg to a GPIO pin, short leg through the resistor to GND)

```canvas
type: wiring
title: External LED on PA1
left: bluepill
right: resistor_220, led_red
wires: bluepill.PA1 > resistor_220.one end #39c5ff; resistor_220.other end > led_red.long leg (+) #ff5c5c "the resistor can go on either side"; led_red.short leg (-) > bluepill.GND #8b93a7
note: This external LED is active-high (the opposite of the onboard PC13). It only lights up with digitalWrite(PA1, HIGH).
```


## Checklist
- [ ] Written without looking at the reference code
- [ ] You can explain why an LED needs a series resistor (ask the AI, then write one sentence in your journal)

## While you're at it: resistors
Grab that handful of color-banded resistors from the kit and play with the bands:

```canvas
type: resistor-color
```
