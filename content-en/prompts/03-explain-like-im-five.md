---
title: Make the AI Explain in Plain English
summary: When you hit a new concept (GPIO, pull-up, PWM, interrupts, clock tree), ask it this way.
---
## Template

```
Explain [concept] with an everyday analogy, then say it again in one technically accurate sentence.
Finally, tell me: if I misunderstood this concept, what would the most common bug look like?
```

## Example: pull-up resistor
> Analogy: a door with nobody pushing it needs a spring to keep it closed by default, otherwise it'll swing around in the wind. A pull-up resistor is that spring. It keeps the pin at high level by default when nothing is touching it.
> Accurate version: the pin is connected to VCC through a resistor, so that a floating input reads a definite high level.
> The bug if you get it wrong: the button glitches even when nobody presses it, and the value you read is random.

## When to use it
Every bolded term that appears for the first time in a task is worth asking about. Write the "one-sentence version" of the answer in your journal.
