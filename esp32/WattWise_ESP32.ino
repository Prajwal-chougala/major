#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define BACKEND_BASE_URL "https://major-mobh.onrender.com"
#define DEVICE_API_KEY "YOUR_DEVICE_API_KEY"

#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#define RELAY_PIN 5

constexpr bool RELAY_ACTIVE_LOW = true;
constexpr unsigned long READING_INTERVAL_MS = 7000;
constexpr unsigned long STATUS_INTERVAL_MS = 3000;

PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
WiFiClientSecure secureClient;

bool relayIsOn = false;
bool relayStateInitialized = false;
unsigned long lastReadingTime = 0;
unsigned long lastStatusTime = 0;

String ingestUrl() {
  return String(BACKEND_BASE_URL) + "/ingest";
}

String statusUrl() {
  return String(BACKEND_BASE_URL) + "/ingest/status";
}

void setRelay(bool turnOn) {
  const bool stateChanged = !relayStateInitialized || relayIsOn != turnOn;
  relayIsOn = turnOn;
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? !turnOn : turnOn);
  if (stateChanged) {
    Serial.printf("[Relay] %s\n", turnOn ? "ON" : "OFF");
  }
  relayStateInitialized = true;
}

bool connectToWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[Wi-Fi] Connecting to %s", WIFI_SSID);
  const unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < 20000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[Wi-Fi] Connected; IP %s\n",
                  WiFi.localIP().toString().c_str());
    return true;
  }

  Serial.println(
      "[Wi-Fi] Connection failed. Check SSID/password and use a 2.4 GHz network.");
  return false;
}

bool readSensor(float &voltage, float &current, float &power,
                float &energy, float &frequency, float &powerFactor) {
  voltage = pzem.voltage();
  current = pzem.current();
  power = pzem.power();
  energy = pzem.energy();
  frequency = pzem.frequency();
  powerFactor = pzem.pf();

  Serial.printf(
      "[PZEM] V=%.2f V, I=%.3f A, P=%.2f W, E=%.3f, F=%.2f Hz, PF=%.2f\n",
      voltage, current, power, energy, frequency, powerFactor);

  if (!isfinite(voltage) || !isfinite(current) || !isfinite(power) ||
      voltage <= 0.0f || current < 0.0f || power < 0.0f) {
    if (!isfinite(voltage) || voltage <= 0.0f) {
      Serial.println(
          "[PZEM] Voltage invalid: check meter supply, UART wiring, and PZEM communication.");
    }
    if (!isfinite(current) || current < 0.0f) {
      Serial.println(
          "[PZEM] Current invalid: check meter communication and current-sensor wiring.");
    }
    if (!isfinite(power) || power < 0.0f) {
      Serial.println(
          "[PZEM] Power invalid: check meter communication and measurement wiring.");
    }
    Serial.println("[PZEM] Reading was not uploaded.");
    return false;
  }
  return true;
}

void sendReading() {
  if (WiFi.status() != WL_CONNECTED) return;

  float voltage;
  float current;
  float power;
  float energy;
  float frequency;
  float powerFactor;
  if (!readSensor(voltage, current, power, energy, frequency, powerFactor)) {
    return;
  }

  HTTPClient http;
  if (!http.begin(secureClient, ingestUrl())) {
    Serial.println("[Ingest] Could not initialize HTTPS request.");
    return;
  }

  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);
  DynamicJsonDocument reading(384);
  reading["voltage"] = voltage;
  reading["current"] = current;
  reading["power"] = power;
  if (isfinite(energy) && energy >= 0.0f) {
    reading["energy"] = energy;
  }
  if (isfinite(frequency) && frequency > 0.0f) {
    reading["frequency"] = frequency;
  }
  if (isfinite(powerFactor) && powerFactor >= 0.0f && powerFactor <= 1.0f) {
    reading["powerFactor"] = powerFactor;
  }
  String body;
  serializeJson(reading, body);

  const int status = http.POST(body);
  if (status >= 200 && status < 300) {
    Serial.printf("[Ingest] Reading accepted (HTTP %d).\n", status);
  } else {
    Serial.printf("[Ingest] Server rejected reading (HTTP %d).\n", status);
  }
  http.end();
}

void syncRelayWithServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  if (!http.begin(secureClient, statusUrl())) {
    Serial.println("[Status] Could not initialize HTTPS request.");
    return;
  }

  http.setTimeout(8000);
  http.addHeader("x-api-key", DEVICE_API_KEY);
  const int status = http.GET();
  if (status == HTTP_CODE_OK) {
    const String body = http.getString();
    DynamicJsonDocument response(768);
    const DeserializationError error = deserializeJson(response, body);
    if (error) {
      Serial.printf("[Status] Response JSON parse failed: %s\n",
                    error.c_str());
    } else {
      const String powerState = response["powerState"] | "";
      if (powerState == "ON") {
        setRelay(true);
      } else if (powerState == "OFF") {
        setRelay(false);
      } else {
        Serial.println("[Status] Server response did not contain ON/OFF state.");
      }
    }
  } else {
    Serial.printf("[Status] Request failed (HTTP %d).\n", status);
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false);

  // setInsecure() disables TLS certificate verification. Configure a trusted
  // CA certificate on secureClient for production deployments.
  secureClient.setInsecure();

  if (connectToWifi()) {
    syncRelayWithServer();
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectToWifi();
    return;
  }

  const unsigned long now = millis();
  if (now - lastStatusTime >= STATUS_INTERVAL_MS) {
    lastStatusTime = now;
    syncRelayWithServer();
  }
  if (now - lastReadingTime >= READING_INTERVAL_MS) {
    lastReadingTime = now;
    sendReading();
  }
}
