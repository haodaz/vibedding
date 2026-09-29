---
title: 0-1 Install the Toolchain
goal: Compile a .bin file with a single command
hardware: No board needed
time: 30 minutes
status: done
---
## What you're doing

Install the tools you need for embedded development on a Mac. We're going with **PlatformIO**, because: it's a command-line tool, so the AI can run it for you directly; it downloads the compiler and libraries automatically; and it supports nearly every STM32 board.

We're not using STM32CubeIDE. It's a huge graphical IDE, and the AI can't see what you're clicking, so it can't help you.

## Steps

```bash
bash tools/setup-mac.sh
```

Check the install:

```bash
bash tools/check-env.sh
```

Then try compiling the first firmware (you don't need the board yet):

```bash
cd firmware/01-blink && pio run
```

The first run downloads the compiler and framework, a few hundred MB, so be patient. If you see `SUCCESS` at the end, you pass.

## Checklist
- [ ] `pio --version` prints something
- [ ] `pio run` compiles successfully inside firmware/01-blink
- [ ] You can find `firmware.bin` under `.pio/build/bluepill/`

## When you ask the AI
Paste the **entire** error message, including the dozen or so lines above it. Pasting only the last `error` line is almost useless. See [Prompt Library · Debug Request Template](#/doc/prompts/02-debug-template.md).

## Common pitfalls
- Python is too old (the 3.6 that ships with macOS won't work). The script uses uv to install a 3.12 into your user directory; no admin password needed
- `pio` command not found: it's not on your PATH yet. Reopen the terminal
- Corporate network / proxy breaks the download: try once on your phone's hotspot
