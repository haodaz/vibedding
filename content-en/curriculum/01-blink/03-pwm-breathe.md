---
title: 1-3 Breathing LED
goal: The LED smoothly brightens and then fades
hardware: Board
time: 45 minutes
status: todo
---
## What you're doing

```canvas
type: board
id: breathe
goals: pinmode:PC13, pwm:PC13
task: Use analogWrite to make the LED on PC13 fade smoothly from dark to bright and back (breathing effect)
rubric: Uses analogWrite; brightness ramps gradually instead of jumping; can explain duty cycle
---
#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
}

void loop() {
  // hint: for loop from 0 to 255, each step analogWrite(PC13, i); delay(5);
  // then back from 255 to 0
}
```

A digital pin is only ever 0 or 1. So how do you get "half bright"? The answer is **PWM**: switch on and off very fast, and fool the eye with the "fraction of time it's on."

Build the breathing LED with `analogWrite`. Then ask the AI: why can't every pin do PWM? That question leads you to the concept of "timers." See you in Module 4.

## Checklist
- [ ] Breathing effect works
- [ ] You can explain PWM "duty cycle" in one sentence
