---
title: Mistakes AI Commonly Makes with Hardware
summary: A living list. Every time the AI burns you, add a row here.
---
## Known trouble spots
| Common AI mistake | How to guard against it |
|---|---|
| Mixing up pin numbers (using the UNO's pin 13 on an STM32) | Always state the board model and check the silkscreen |
| Made-up library names / nonexistent versions | Search registry.platformio.org |
| Says the Blue Pill LED is active-high | It's actually active-low on PC13 |
| Mixing HAL and Arduino functions | State the framework clearly when you ask |
| "Assumes" baud rates and I2C addresses | Confirm with a scanner program / real measurement |

## The principle
The AI is someone who has read every manual but has never touched your board. **It does the thinking, you do the testing.**
