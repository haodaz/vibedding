#include <Arduino.h>

void setup() {
  pinMode(2, OUTPUT); // onboard LED GPIO2
}

void loop() {
  digitalWrite(2, HIGH); // LED on (active high)
  delay(500);
  digitalWrite(2, LOW);  // LED off
  delay(500);
}