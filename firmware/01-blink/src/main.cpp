// 任务 1-1：让板载 LED 眨眼。
// 这是嵌入式的 "Hello World"。它证明了三件事：编译器能用、烧录通了、板子活着。
//
// 用的是 Arduino 框架（STM32duino），因为它把寄存器操作藏起来了，
// 让门外汉先体验"我写的代码在真实硅片上跑"。以后在模块 5 会把它剥开看。

#include <Arduino.h>

#ifndef LED_PIN
#define LED_PIN PC13   // 默认按蓝药丸。platformio.ini 里的 build_flags 会覆盖它
#endif

void setup() {
  pinMode(LED_PIN, OUTPUT);       // 告诉芯片：这个脚我要用来"输出"电平
  Serial.begin(115200);           // 打开串口，之后能在电脑上看到打印
  Serial.println("hello from stm32");
}

void loop() {
  digitalWrite(LED_PIN, LOW);     // 蓝药丸的 LED 接的是"低电平点亮"
  delay(500);                     // 傻等 500ms。模块 4 会教你为什么不该这么做
  digitalWrite(LED_PIN, HIGH);
  delay(500);
}
