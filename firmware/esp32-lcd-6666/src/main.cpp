// 点赞 6666：LCD1602 (I2C) 显示滚动的 6666 和自定义的大拇指图案，背光跟着节奏闪。
// 接线：GND→GND，VCC→5V，SDA→GPIO21，SCL→GPIO22（ESP32 默认 I2C）
// I2C 地址不用猜：启动时扫描总线，用找到的第一个设备（常见 0x27 或 0x3F）。
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// 大拇指（5x8 点阵），两格拼成一个：左半 + 右半
byte thumbL[8] = { B00100, B00110, B00110, B01110, B11110, B11110, B01110, B00110 };
byte thumbR[8] = { B00000, B00000, B00000, B11100, B11110, B11110, B11100, B11000 };
// 实心心形
byte heart[8]  = { B00000, B01010, B11111, B11111, B01110, B00100, B00000, B00000 };

uint8_t findLcd() {
  Wire.begin(21, 22);
  for (uint8_t a = 1; a < 127; a++) { Wire.beginTransmission(a); if (Wire.endTransmission() == 0) { Serial.printf("I2C 设备: 0x%02X\n", a); return a; } }
  return 0x27; // 没扫到就按最常见的试
}

LiquidCrystal_I2C* lcd;
const char* line = "6666 6666 6666 6666 6666 ";

void setup() {
  Serial.begin(115200);
  delay(200);
  uint8_t addr = findLcd();
  lcd = new LiquidCrystal_I2C(addr, 16, 2);
  lcd->init();
  lcd->backlight();
  lcd->createChar(0, thumbL);
  lcd->createChar(1, thumbR);
  lcd->createChar(2, heart);
  lcd->setCursor(0, 0); lcd->print(" VIBEDDING  ");
  lcd->write(0); lcd->write(1);
  lcd->setCursor(0, 1); lcd->print("  Hello, Haoz!  ");
  Serial.printf("LCD @0x%02X ready\n", addr);
  delay(1500);
}

int offset = 0;
bool on = true;

void loop() {
  // 第一行：6666 向左滚动
  lcd->setCursor(0, 0);
  for (int i = 0; i < 16; i++) lcd->print(line[(offset + i) % strlen(line)]);
  // 第二行：大拇指 + 心 + 大拇指 交替
  lcd->setCursor(0, 1);
  lcd->print("  "); lcd->write(0); lcd->write(1); lcd->print(" "); lcd->write(2);
  lcd->print(" 6666 "); lcd->write(2); lcd->print(" "); lcd->write(0); lcd->write(1); lcd->print("  ");
  offset++;
  if (offset % 8 == 0) { on = !on; if (on) lcd->backlight(); else lcd->noBacklight(); }
  delay(180);
}
