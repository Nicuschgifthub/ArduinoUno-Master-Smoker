#include <Arduino.h>

bool overrideActive = false;
int liveFan = 0;
int liveSmoke = 0;
int liveIndex = 0;
const char* lastAttr = "init";

struct PinMapping { const char *name; int pin; };
struct Step { const char *attr; long value; };

PinMapping myPins[] = { {"fan", 5}, {"smoke", 10} };

// Smoke Config
Step preSequence[] = { 
    {"smoke", 1},
    {"wait", 5000} };
Step mainSequence[] = { 
    {"fan", 1},
    {"wait", 250},
    {"fan", 0},
    {"wait", 30000},
    {"fan", 1},
    {"wait", 350},
    {"fan", 0},
    {"wait", 60000},
    {"fan", 1},
    {"wait", 250},
    {"fan", 0},
    {"wait", 120000},
    {"fan", 1},
    {"wait", 500},
    {"fan", 0},
    {"wait", 45000},
    {"fan", 1},
    {"wait", 300},
    {"fan", 0},
    {"wait", 10000},
    {"fan", 1},
    {"wait", 300},
    {"fan", 0},
    {"wait", 70000}
};

// --- Code to run the Seq ---
int getPinByName(const char *name) {
  for (unsigned int i = 0; i < sizeof(myPins) / sizeof(myPins[0]); i++) {
    if (strcmp(myPins[i].name, name) == 0) return myPins[i].pin;
  }
  return -1;
}

void reportStatus(const char* currentStep) {
    Serial.print("RUNNING:");
    Serial.print(currentStep);
    Serial.print("|INDEX:");
    Serial.print(liveIndex);
    Serial.print("|FAN:");
    Serial.print(liveFan);
    Serial.print("|SMOKE:");
    Serial.println(liveSmoke);
}

void updateHardware() {
    int fanPin = getPinByName("fan");
    int smokePin = getPinByName("smoke");
    if (fanPin != -1) digitalWrite(fanPin, (liveFan == 1 ? LOW : HIGH));
    if (smokePin != -1) digitalWrite(smokePin, (liveSmoke == 1 ? LOW : HIGH));
}

// --- The Listener ---
void checkSerial() {
    if (Serial.available() > 0) {
        String msg = Serial.readStringUntil('\n');

        msg.trim();

        if (msg == "MANUAL:ON") {
            overrideActive = true;
        } 
        else if (msg == "MANUAL:OFF") {
            overrideActive = false;
        }
        
        if (overrideActive) {
            if (msg.indexOf("FAN:1") >= 0) liveFan = 1;
            if (msg.indexOf("FAN:0") >= 0) liveFan = 0;
            if (msg.indexOf("SMOKE:1") >= 0) liveSmoke = 1;
            if (msg.indexOf("SMOKE:0") >= 0) liveSmoke = 0;
            updateHardware();
        }
    }
}

void executeStep(Step s, int index) {
    // If manual mode was turned on, skip the auto sequence
    if (overrideActive) return;

    lastAttr = s.attr;
    liveIndex = index;

    if (strcmp(s.attr, "wait") == 0) {
        long remaining = s.value;
        while (remaining > 0 && !overrideActive) { 
            reportStatus("wait"); // Keep reporting while waiting
            checkSerial(); 
            delay(100); 
            remaining -= 100; 
        }
    } else {
        int pin = getPinByName(s.attr);
        if (pin != -1) { 
            if (strcmp(s.attr, "fan") == 0) liveFan = s.value;
            if (strcmp(s.attr, "smoke") == 0) liveSmoke = s.value;
            
            digitalWrite(pin, (s.value == 1 ? LOW : HIGH)); 
        }
        reportStatus(s.attr);
    }
}

void setup() {
  Serial.begin(57600);
  for (unsigned int i = 0; i < sizeof(myPins) / sizeof(myPins[0]); i++) {
    pinMode(myPins[i].pin, OUTPUT);
    digitalWrite(myPins[i].pin, HIGH); // Start OFF (Relay HIGH = OFF)
  }
  
  // Run Pre-sequence
  for (unsigned int i = 0; i < sizeof(preSequence) / sizeof(preSequence[0]); i++) { 
    if (overrideActive) break;
    executeStep(preSequence[i], -1); 
  }
}

void loop() {
    checkSerial(); // Always check for Manual Master switch

    if (overrideActive) {
        reportStatus("MANUAL");
        delay(200); // Slow down the loop slightly in manual mode
    } else {
        for (unsigned int i = 0; i < sizeof(mainSequence) / sizeof(mainSequence[0]); i++) {
            if (overrideActive) break; // Exit sequence immediately if manual turned on
            executeStep(mainSequence[i], i);
        }
    }
}