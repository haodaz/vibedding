#include <Arduino.h>
#include <Wire.h>
#include <RTClib.h>
#include <Servo.h>

// 已按蓝药丸引脚表规划：I2C1 PB6/PB7，舵机信号 PA0，按键 PA1
constexpr uint8_t SERVO_PIN = PA0;
constexpr uint8_t BUTTON_PIN = PA1;
constexpr uint8_t LED_PIN_LOCAL = PC13; // 低电平点亮
constexpr uint8_t OPEN_ANGLE = 95;
constexpr uint8_t CLOSED_ANGLE = 10;
constexpr uint32_t DISPENSE_MS = 1200;

// 改成实际喂食时间，例如 7:00 和 19:00
constexpr uint8_t MORNING_HOUR = 7;
constexpr uint8_t MORNING_MINUTE = 0;
constexpr uint8_t EVENING_HOUR = 19;
constexpr uint8_t EVENING_MINUTE = 0;

RTC_DS3231 rtc;
Servo gateServo;
int lastAutomaticDay = -1;
bool dispensing = false;
uint32_t dispenseStarted = 0;
bool lastButton = HIGH;
uint32_t lastButtonChange = 0;

void startDispense(const char* reason) {
  if (dispensing) return;
  Serial.print("出粮: "); Serial.println(reason);
  gateServo.write(OPEN_ANGLE);
  dispensing = true;
  dispenseStarted = millis();
  digitalWrite(LED_PIN_LOCAL, LOW);
}

void finishDispense() {
  gateServo.write(CLOSED_ANGLE);
  dispensing = false;
  digitalWrite(LED_PIN_LOCAL, HIGH);
  Serial.println("舱门关闭");
}

void checkButton() {
  bool now = digitalRead(BUTTON_PIN);
  if (now != lastButton) {
    lastButtonChange = millis();
    lastButton = now;
  }
  if (now == LOW && millis() - lastButtonChange > 30) {
    startDispense("手动按键");
    while (digitalRead(BUTTON_PIN) == LOW) delay(1);
    lastButton = HIGH;
  }
}

void checkSchedule(const DateTime& now) {
  bool morning = now.hour() == MORNING_HOUR && now.minute() == MORNING_MINUTE;
  bool evening = now.hour() == EVENING_HOUR && now.minute() == EVENING_MINUTE;
  if ((morning || evening) && now.day() != lastAutomaticDay) {
    lastAutomaticDay = now.day();
    startDispense(morning ? "早餐定时" : "晚餐定时");
  }
}

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN_LOCAL, OUTPUT);
  digitalWrite(LED_PIN_LOCAL, HIGH);
  Serial.begin(115200);
  Wire.begin(); // PB7 SDA / PB6 SCL（Arduino STM32 默认 I2C1）
  if (!rtc.begin()) {
    Serial.println("错误：找不到 DS3231，先检查接线");
  }
  // 首次使用时取消下一行注释并烧录一次，再注释回去重新烧录，避免每次重启重置时间。
  // rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  gateServo.attach(SERVO_PIN);
  gateServo.write(CLOSED_ANGLE);
  Serial.println("自动喂食器启动");
}

void loop() {
  if (dispensing && millis() - dispenseStarted >= DISPENSE_MS) finishDispense();
  checkButton();
  DateTime now = rtc.now();
  checkSchedule(now);
  delay(20);
}
