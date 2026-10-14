#include <Arduino.h>
// HC-SR04: VCC->5V, GND->GND, TRIG->PB8, ECHO->PB9 (5V tolerant)
// Buzzer on PA1, LED on PA2 with 220Ω resistor
const int TRIG = PB8;
const int ECHO = PB9;
const int BUZZER = PA1;
const int LED_PIN = PA2;

// Threshold distance (cm) above which water is considered low
const float LOW_WATER_THRESHOLD = 10.0; // adjust after measuring

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(TRIG, LOW);
  digitalWrite(BUZZER, LOW);
  digitalWrite(LED_PIN, LOW);
}

// Simulate distance reading for now; replace with real pulseIn later
float readDistanceCm() {
  // For simulation, return a static value; user can change via serial?
  // We'll just return 8 cm (water present) to test alarm off
  return 8.0;
}

void loop() {
  float dist = readDistanceCm();
  Serial.print("Distance: ");
  Serial.print(dist, 1);
  Serial.println(" cm");

  bool lowWater = dist > LOW_WATER_THRESHOLD;
  digitalWrite(BUZZER, lowWater ? HIGH : LOW);
  digitalWrite(LED_PIN, lowWater ? HIGH : LOW);

  delay(500);
}