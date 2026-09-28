#!/usr/bin/env bash
# 看串口输出。 用法： bash tools/monitor.sh [波特率，默认115200]
pio device monitor -b "${1:-115200}"
