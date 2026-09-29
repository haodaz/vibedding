---
title: The Universal Template for Hardware Questions
summary: Board model + framework + what you want + what you've tried. Leave one out and the AI starts guessing.
---
## Template

```
My board: STM32F103C8T6 Blue Pill, using PlatformIO + Arduino framework, flashed with ST-Link.
I want to: [one sentence]
I've already tried: [code / steps]
What I see: [what happened]
What I expected: [what should have happened]

Please explain the principle first, then give code. For every pin number in the code, note how you determined it.
```

## Why ask this way
- **Leave out the board model**, and the AI assumes you're on an Arduino UNO. Every pin number will be wrong
- **Leave out the framework**, and it might give you HAL code while you're using Arduino, or vice versa
- **"Explain first, then code"** forces it to be clear, and forces you to understand. Vibe coding doesn't mean not understanding. It means understanding faster

## Verification checklist (after the AI answers)
- [ ] Pin numbers: check them against the board's silkscreen or schematic
- [ ] Library names: search https://registry.platformio.org to see if they actually exist
- [ ] Register names: search for them in the reference manual
