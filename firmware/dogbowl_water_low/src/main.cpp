#include <Arduino.h>

const int TRIG = PB8;
const int ECHO = PB9;
const int BUZZ = PA1;

// Threshold distance in cm: if distance > THRESHOLD, water low (bowl empty)
// Adjust after testing; typical bowl depth maybe 5 cm, so set 8 cm.
const float THRESHOLD = 8.0;

float readDistanceCm() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 30000); // timeout 30ms
  if (us == 0) return -1; // out of range
  return us * 0.0343f / 2.0f;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(BUZZ, OUTPUT);
  digitalWrite(BUZZ, LOW);
}

void loop() {
  float dist = readDistanceCm();
  if (dist < 0) {
    Serial.println("Sensor out of range or not connected");
    digitalWrite(BUZZ, LOW);
  } else {
    Serial.print("Distance: ");
    Serial.print(dist, 1);
    Serial.println(" cm");
    if (dist > THRESHOLD) {
      digitalWrite(BUZZ, HIGH); // buzzer on
    } else {
      digitalWrite(BUZZ, LOW);
    }
  }
  delay(500);
}