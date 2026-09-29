---
title: Module 0 · Before Takeoff
art: mod0_setup
summary: Install the tools, get to know your board, and flash a program without writing a single line of code. The goal is to kill the feeling that "hardware is scary."
---
# Module 0 · Before Takeoff

This module doesn't teach programming. It does exactly one thing: **you type a command on your computer, and an LED on the board lights up.**

For a beginner, the biggest hurdle in embedded isn't the C language. It's the whole chain of "how does my computer actually connect to the board":

```
your code → compiler → binary file → programmer (ST-Link) → the chip's Flash → power on and run
```

Every link can break, and the error messages are not beginner-friendly. So Module 0's job is to walk this chain **by hand, once**. After that, every task is just "change the code → repeat the chain."

## After this module you can
- Name your board's chip, clock speed, and Flash size (no memorizing, just know where to look)
- Compile with one command, flash with one command, watch serial with one command
- Know the three places to check when the board isn't recognized
