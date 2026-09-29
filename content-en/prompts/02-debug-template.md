---
title: Debug Request Template
summary: Full error output + your own guess + what you want it to do. Make the AI a detective, not a fortune teller.
---
## Template

```
Environment: macOS, PlatformIO, board [model], flashing via [ST-Link / serial]
I'm running: [command]
Full output below (nothing removed):
[paste]

My guess is [your guess], but I'm not sure.
Please list the 3 most likely causes, ranked by probability, and for each give a way to verify it in under 1 minute.
```

## Key points
- **Full** output. The real cause is usually 10 lines from the bottom, not on the last line
- Ask for "ways to verify" rather than a direct "solution." Change one variable at a time so you know which one made the difference
- Report each verification result back to it. Go a few rounds
