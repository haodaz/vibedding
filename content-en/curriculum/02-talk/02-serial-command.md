---
title: 2-2 Send Commands from Your Computer
goal: Type on/off on your computer and the board's LED follows
hardware: Same as above
time: 1 hour
status: todo
---
## What you're doing

The input box at the bottom of the serial monitor below is "computer sends to board." Type `on` and hit Enter to try it.

```canvas
type: board
id: serial-cmd
goals: pinmode:PC13, serial
task: Receive a line of command over serial: on lights the LED, off turns it off, anything else replies unknown
rubric: Uses Serial.available to check for data; uses readStringUntil to read a line; compares strings; replies with a confirmation
---
#include <Arduino.h>

void setup() {
  pinMode(PC13, OUTPUT);
  digitalWrite(PC13, HIGH);
  Serial.begin(115200);
  Serial.println("ready. type on / off");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    // if (cmd == "on") ...
  }
}
```

`Serial.available()`, `Serial.readStringUntil('\n')`. Build a bare-bones command line.

## Going further
Add a `blink 200` command that sets the blink period. You'll discover that `delay` stops the board from receiving commands while it's blinking. We'll save that pain point for Module 4.
