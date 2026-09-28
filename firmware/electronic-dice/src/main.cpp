#include <Arduino.h>

// 7 个位置：左上、右上、左中、中、右中、左下、右下
// 这里使用蓝药丸的 PA0~PA6；虚拟板会模拟这些 GPIO
const int LEDS[7] = {PA0, PA1, PA2, PA3, PA4, PA5, PA6};
const int BUTTON = PB12;

const uint8_t FACE[7][7] = {
  {0, 0, 0, 0, 0, 0, 0}, // 0：全灭
  {0, 0, 0, 1, 0, 0, 0}, // 1
  {1, 0, 0, 0, 0, 0, 1}, // 2
  {1, 0, 0, 1, 0, 0, 1}, // 3
  {1, 1, 0, 0, 0, 1, 1}, // 4
  {1, 1, 0, 1, 0, 1, 1}, // 5
  {1, 1, 1, 0, 1, 1, 1}  // 6
};

void showDice(int number) {
  for (int i = 0; i < 7; i++) {
    digitalWrite(LEDS[i], FACE[number][i]);
  }
}

bool buttonPressed() {
  if (digitalRead(BUTTON) != LOW) return false;
  delay(30); // 简单去抖：确认不是按键弹跳
  return digitalRead(BUTTON) == LOW;
}

void setup() {
  for (int i = 0; i < 7; i++) pinMode(LEDS[i], OUTPUT);
  pinMode(BUTTON, INPUT_PULLUP); // 松开=HIGH，按下=LOW

  // PA7 不接任何东西时会有一点噪声，作为伪随机种子
  randomSeed(analogRead(PA7));
  showDice(0);
}

void loop() {
  if (buttonPressed()) {
    // 模拟骰子滚动：逐渐变慢
    for (int i = 0; i < 15; i++) {
      showDice(random(1, 7));
      delay(60 + i * 15);
    }

    int result = random(1, 7);
    showDice(result);

    // 等待松手，避免一次长按触发多次
    while (digitalRead(BUTTON) == LOW) delay(5);
  }
}
