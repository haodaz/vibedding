#!/usr/bin/env bash
# 一键装 macOS 上的嵌入式工具链。可以重复运行，已装的会跳过。
# 用法： bash tools/setup-mac.sh
set -euo pipefail

say() { printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

if ! have brew; then
  echo "没有 Homebrew。先装它： https://brew.sh"; exit 1
fi

say "1/4 Python 3（PlatformIO 需要 3.9+，系统自带的 3.6 太老）"
if ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3,9) else 1)' 2>/dev/null; then
  brew install python@3.12
fi
PY=$(command -v python3.12 || command -v python3)
echo "使用: $PY ($($PY --version))"

say "2/4 PlatformIO Core（命令行编译/烧录/串口，AI 最容易驱动的方式）"
if ! have pio; then
  "$PY" -m pip install --user -U platformio
  # 把 pio 加进 PATH
  USERBASE=$("$PY" -m site --user-base)
  if ! grep -q "$USERBASE/bin" ~/.zshrc 2>/dev/null; then
    echo "export PATH=\"$USERBASE/bin:\$PATH\"" >> ~/.zshrc
    echo "已把 $USERBASE/bin 加入 ~/.zshrc，重新打开终端或执行 source ~/.zshrc"
  fi
  export PATH="$USERBASE/bin:$PATH"
fi
pio --version

say "3/4 烧录 / 调试工具（ST-Link 用 openocd 或 stlink，串口 DFU 用 dfu-util）"
have openocd  || brew install open-ocd
have st-flash || brew install stlink
have dfu-util || brew install dfu-util

say "4/4 串口工具（可选，minicom 看串口输出很方便）"
have minicom || brew install minicom

say "全部完成。接下来： bash tools/check-env.sh"
