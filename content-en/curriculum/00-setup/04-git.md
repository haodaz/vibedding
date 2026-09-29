---
title: 0-4 The Only 5 git Commands You Need
goal: Save today's work as a "save point" and know how to get back to it
hardware: No board needed
time: 30 minutes
status: todo
---
## What git is
It's the **save system** in a video game. Every time you make a bit of progress, save. If you break something, reload. That's it. Don't learn anything else yet.

## The 5 commands
| Command | In plain English | When to use it |
|---|---|---|
| `git status` | Which files did I change? | Anytime. Looking is free |
| `git add .` | Put all my changes in the "to be saved" pile | Before saving |
| `git commit -m "one sentence"` | Save, with a note about what you did | LED lit up / a task is done |
| `git log --oneline` | Show all save points | When you want to see how far you've come |
| `git checkout -- filename` | I broke this file, take it back to the last save | When you've broken something |

Branches, merging, rebase, remotes: **not now**. When you want to put your work on GitHub for others to see, learn `git push` then. That's a separate card.

## Practice
```bash
git status
```
```bash
git add .
```
```bash
git commit -m "Day 0: platform skeleton is up"
```
```bash
git log --oneline
```

## Working with the AI
Say "save a checkpoint for me, the note is xxx" and it'll run add + commit. All you need to do is occasionally run `git log --oneline` yourself and look at the history. It feels good.

## One rule
**When the LED lights up, commit.** Any visible progress deserves a save point. Too many saves never hurt anyone. Too few will make you cry.
