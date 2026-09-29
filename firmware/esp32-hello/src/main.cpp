// ESP32 的 Hello：串口每秒打印一次计数，同时让 GPIO2 每秒翻转一次（Freenove 这块板上如果有板载 LED 通常接在这里；没有的话接一颗 LED 到 GPIO2 也能看到）
#include <Arduino.h>

const int LED = 2;
int counter = 0;

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("hello from esp32 (vibedding)");
}

void loop() {
  digitalWrite(LED, HIGH);
  delay(500);
  digitalWrite(LED, LOW);
  delay(500);
  Serial.printf("tick %d\n", counter++);
}
