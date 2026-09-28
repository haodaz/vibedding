#!/usr/bin/env bash
# 体检：哪些工具有了、板子插上了没。
# 用法： bash tools/check-env.sh
export PATH="$HOME/.local/bin:$HOME/.platformio/penv/bin:$PATH"
ok()   { printf "  \033[32m✔\033[0m %-14s %s\n" "$1" "$2"; }
miss() { printf "  \033[31m✘\033[0m %-14s %s\n" "$1" "$2"; }
check() { if command -v "$1" >/dev/null 2>&1; then ok "$1" "$($2 2>&1 | head -1)"; else miss "$1" "$3"; fi; }

echo "软件："
check node     "node -v"          "平台需要。brew install node"
check npm      "npm -v"           "随 node 一起"
check uv       "uv --version"    "bash tools/setup-mac.sh"
check pio      "pio --version"    "bash tools/setup-mac.sh"
echo "  （openocd / st-link 由 PlatformIO 在第一次烧录时自动下载，不用单独装）"

echo
echo "USB 设备（板子/ST-Link 插上后应该能看到）："
ls /dev/cu.* 2>/dev/null | grep -v Bluetooth | sed 's/^/  串口: /' || true
system_profiler SPUSBDataType 2>/dev/null | grep -i -E "st-link|stm32|ch340|cp210|ftdi|serial" | sed 's/^ */  USB: /' || true
echo "  (没看到就是没插 / 没识别。ST-Link 会显示为 STM32 STLink；CH340 是常见的 USB 转串口芯片)"
