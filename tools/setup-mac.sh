#!/usr/bin/env bash
# 一键装 macOS 上的嵌入式工具链。不需要管理员密码：全部装进你自己的用户目录。
# 可以重复运行，已装的会跳过。   用法： bash tools/setup-mac.sh
set -euo pipefail
say() { printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }
export PATH="$HOME/.local/bin:$PATH"

say "1/3 uv（一个小工具，负责装 Python 和 PlatformIO，不需要 sudo）"
if ! have uv; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi
uv --version

say "2/3 Python 3.12（PlatformIO 需要 3.9+，系统自带的太老）"
uv python install 3.12

say "3/3 PlatformIO Core（命令行编译/烧录/串口，AI 最容易驱动的方式）"
if ! have pio; then
  uv tool install platformio
fi
pio --version

# 烧录/调试工具（openocd、st-link）不用单独装：PlatformIO 第一次烧录时会自己下载到 ~/.platformio/packages
if ! grep -q 'HOME/.local/bin' "$HOME/.zshrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
  echo "已把 ~/.local/bin 加入 ~/.zshrc（新开的终端才生效）"
fi

say "全部完成。接下来： bash tools/check-env.sh"
