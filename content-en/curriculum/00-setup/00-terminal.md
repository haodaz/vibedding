---
title: 0-0 The Only 8 Terminal Commands You Need
goal: Stop fearing the black box. Open a terminal, get into the project folder, run a script, and tell whether it succeeded or failed
hardware: No board needed
time: 20 minutes
status: done
---
## The short version
You don't need to "learn the terminal." In this project, 90% of the time you'll only use the 8 commands below, and most of the time you'll have the AI type them for you. Your job is to **understand what you're looking at**.

| Command | In plain English | What success looks like |
|---|---|---|
| `pwd` | Which folder am I in? | Prints a path |
| `ls` | What's in this folder? | Lists file names |
| `cd foldername` | Go into that folder | No output at all = success (silence is golden in the terminal) |
| `cd ..` | Go back up one level | Same as above |
| `cat filename` | Print the file's contents | Shows the contents |
| `bash script.sh` | Run a script | Whatever the script itself prints |
| `npm run dev` | Start the web app | A `http://localhost:xxxx` address appears |
| `Ctrl + C` | Stop whatever is running | The cursor comes back |

## Three facts that take the fear away
1. **The terminal won't break because you typed a command wrong.** Worst case you get `command not found`. Just type it again.
2. **No output is usually good news.** A successful `cd` shows nothing.
3. **Red text isn't always an error.** Lots of warnings are red and harmless. Real errors usually say `Error` / `failed` / `✘`.

## Practice
From the project root (`embeded/`), run these in order:

```bash
pwd
```
```bash
ls
```
```bash
bash tools/check-env.sh
```

If you see the environment checkup results, you pass.

## How to work with the AI
In Claude Code or Cursor, just say "run the environment checkup script for me." It'll type the command. You read the result. **If it types a command you don't understand, ask it to explain that command.** This is the fastest way to learn the terminal: learn on demand, don't memorize.
