#include <Arduino.h>

// Freenove ESP32-WROVER: onboard LED is GPIO2 and lights when HIGH.
const int LED = 2;
const unsigned long SHORT_ON = 180;
const unsigned long LONG_ON = 540;
const unsigned long SYMBOL_GAP = 180;
const unsigned long LETTER_GAP = 540;
const unsigned long MESSAGE_GAP = 1200;

void ledFor(unsigned long onTime) {
  digitalWrite(LED, HIGH);
  delay(onTime);
  digitalWrite(LED, LOW);
  delay(SYMBOL_GAP);
}

void setup() {
  pinMode(LED, OUTPUT);
  digitalWrite(LED, LOW);
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("ESP32 SOS ready: ... --- ...");
}

void loop() {
  Serial.println("SOS: S ...");
  for (int i = 0; i < 3; i++) ledFor(SHORT_ON);
  delay(LETTER_GAP);

  Serial.println("SOS: O ---");
  for (int i = 0; i < 3; i++) ledFor(LONG_ON);
  delay(LETTER_GAP);

  Serial.println("SOS: S ...");
  for (int i = 0; i < 3; i++) ledFor(SHORT_ON);
  Serial.println("SOS: cycle complete");
  delay(MESSAGE_GAP);
}
