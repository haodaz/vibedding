# 云编译镜像：PlatformIO + 预装 STM32/ESP32 工具链（第一次编译不用等下载）
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates nodejs && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir platformio==6.*
ENV PLATFORMIO_CORE_DIR=/opt/pio PLATFORMIO_SETTING_ENABLE_TELEMETRY=false
# 预热：各编译一次空工程，把平台包缓存进镜像
WORKDIR /warm
RUN for b in "ststm32 bluepill_f103c8" "espressif32 esp32dev"; do set -- $b; mkdir -p $2/src && printf "[env:main]\nplatform=$1\nboard=$2\nframework=arduino\n" > $2/platformio.ini && printf "#include <Arduino.h>\nvoid setup(){}\nvoid loop(){}\n" > $2/src/main.cpp && (cd $2 && pio run -e main) && rm -rf $2/.pio; done
WORKDIR /app
# 构建上下文可能是仓库根目录，也可能是 compile-server/ 目录，两种都能找到 server.mjs
COPY . /src
RUN if [ -f /src/server.mjs ]; then cp /src/server.mjs /app/server.mjs; else cp /src/compile-server/server.mjs /app/server.mjs; fi && rm -rf /src
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
