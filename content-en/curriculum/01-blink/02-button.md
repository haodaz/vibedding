---
title: 1-2 Control the LED with a Button
goal: Press for on, release for off; then change it to toggle on each press
hardware: Board, pushbutton (or onboard button), jumper wires
time: 1 hour
status: todo
---
## What you're doing

First, understand what a "pull-up" is. Hold the button below and watch what the pin reads, then turn the pull-up off and try again:

```canvas
type: pullup
```

Then write the code on the virtual board. The yellow button in the bottom-right corner of the board sits between **PA0** and GND. Holding it down connects PA0 to ground.

Here's the real wiring (using the internal pull-up, so no external resistor needed):

```canvas
type: wiring
title: Button on PA0
left: bluepill
right: button
wires: bluepill.PA0 > button.pin 1 #ffb454; bluepill.GND > button.pin 2 #8b93a7
note: A tactile button has four legs. The two legs on the same side are already connected to each other. Wiring to two diagonal legs is the safest bet.
```


```canvas
type: board
id: button
goals: input:PA0, pinmode:PC13, no-warn
task: Hold the button (PA0, to ground) and the LED turns on; release and it turns off. Advanced: each press toggles the LED, with no glitching (debounce)
rubric: PA0 configured as INPUT_PULLUP; reads the button with digitalRead; understands that pressed reads 0; advanced version has debouncing
---
#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
  pinMode(PA0, INPUT_PULLUP);   // internal pull-up: reads 1 when released, 0 when pressed
}

void loop() {
  int pressed = digitalRead(PA0) == LOW;
  digitalWrite(PC13, pressed ? LOW : HIGH);   // active-low LED
}
```

Your first time **reading** a pin. Learn `INPUT_PULLUP` and `digitalRead`.

## The wall you'll hit
When you switch to toggle-on-press, you'll notice that sometimes one press toggles twice. That's **button bounce**, and it's a rite of passage for every embedded developer. Have the AI explain "debounce," then implement one yourself.

## Checklist
- [ ] Hold for on, release for off
- [ ] One press toggles, with no glitching
- [ ] Write down your understanding of "pull-up resistor" in your journal
