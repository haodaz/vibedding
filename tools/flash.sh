#!/usr/bin/env bash
# 编译并烧录一个固件项目。 用法： bash tools/flash.sh firmware/01-blink
set -euo pipefail
cd "${1:?用法: tools/flash.sh <firmware目录>}"
pio run -t upload
