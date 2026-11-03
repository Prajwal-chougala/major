#include <ArduinoJson.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#define WIFI_FALLBACK_SSID "YOUR_WIFI_SSID"
#define WIFI_FALLBACK_PASSWORD "YOUR_WIFI_PASSWORD"
#define SETUP_AP_PASSWORD "replace_with_unique_setup_password"
#define BACKEND_BASE_URL "https://your-backend.example.com"
#define DEVICE_API_KEY "replace_with_device_api_key"

#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#define RELAY_PIN 5

constexpr bool RELAY_ACTIVE_LOW = true;
constexpr unsigned long READING_INTERVAL_MS = 7000;
constexpr unsigned long STATUS_INTERVAL_MS = 3000;
constexpr byte DNS_PORT = 53;

PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
WiFiClientSecure secureClient;
Preferences preferences;
WebServer setupServer(80);
DNSServer dnsServer;

String currentSSID;
String currentPassword;
bool setupPortalActive = false;
bool relayIsOn = false;
unsigned long lastReadingTime = 0;
unsigned long lastStatusTime = 0;

String ingestUrl() {
  return String(BACKEND_BASE_URL) + "/ingest";
}

String statusUrl() {
  return String(BACKEND_BASE_URL) + "/ingest/status";
}

void setRelay(bool turnOn) {
  relayIsOn = turnOn;
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? !turnOn : turnOn);
  Serial.printf("[Relay] %s\n", turnOn ? "ON" : "OFF");
}

void loadWifiCredentials() {
  preferences.begin("wattwise", false);
  currentSSID = preferences.getString("ssid", WIFI_FALLBACK_SSID);
  currentPassword = preferences.getString("password", WIFI_FALLBACK_PASSWORD);
  preferences.end();
}

void saveWifiCredentials(const String &ssid, const String &password) {
  preferences.begin("wattwise", false);
  preferences.putString("ssid", ssid);
  preferences.putString("password", password);
  preferences.end();
  currentSSID = ssid;
  currentPassword = password;
}

void handleSetupRoot() {
  const String page =
      "<!doctype html><html><head><meta name='viewport' "
      "content='width=device-width,initial-scale=1'></head><body>"
      "<h2>WattWise Wi-Fi Setup</h2>"
      "<form method='post' action='/save'>"
      "<label>Network name <input name='ssid' required></label><br>"
      "<label>Password <input name='password' type='password'></label><br>"
      "<button type='submit'>Save Wi-Fi</button></form></body></html>";
  setupServer.send(200, "text/html", page);
}

void handleSetupSave() {
  const String ssid = setupServer.arg("ssid");
  const String password = setupServer.arg("password");
  if (ssid.length() == 0) {
    setupServer.send(400, "text/plain", "Wi-Fi network name is required.");
    return;
  }

  saveWifiCredentials(ssid, password);
  setupServer.send(
      200,
      "text/html",
      "<html><body><p>Wi-Fi saved. WattWise is reconnecting.</p></body></html>");
  delay(500);
  setupServer.stop();
  dnsServer.stop();
  WiFi.softAPdisconnect(true);
  setupPortalActive = false;
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(250);
  WiFi.begin(currentSSID.c_str(), currentPassword.c_str());
}

void startSetupPortal() {
  if (setupPortalActive) return;

  WiFi.mode(WIFI_AP);
  if (!WiFi.softAP("WattWise-Setup", SETUP_AP_PASSWORD)) {
    Serial.println("[Setup] Could not start the Wi-Fi setup access point.");
    return;
  }

  const IPAddress address = WiFi.softAPIP();
  dnsServer.start(DNS_PORT, "*", address);
  setupServer.on("/", HTTP_GET, handleSetupRoot);
  setupServer.on("/save", HTTP_POST, handleSetupSave);
  setupServer.onNotFound(handleSetupRoot);
  setupServer.begin();
  setupPortalActive = true;
  Serial.printf("[Setup] Connect to WattWise-Setup and open %s\n",
                address.toString().c_str());
}

bool connectToWifi() {
  if (currentSSID.length() == 0) {
    startSetupPortal();
    return false;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(currentSSID.c_str(), currentPassword.c_str());
  Serial.printf("[Wi-Fi] Connecting to %s", currentSSID.c_str());
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

  Serial.println("[Wi-Fi] Connection failed. Starting offline setup portal.");
  startSetupPortal();
  return false;
}

void syncWifiCredentials(JsonVariantConst response) {
  const char *serverSSID = response["wifiSSID"] | "";
  const char *serverPassword = response["wifiPassword"] | "";

  const String updatedSSID =
      strlen(serverSSID) > 0 ? String(serverSSID) : currentSSID;
  const String updatedPassword(serverPassword);
  if (updatedSSID.length() == 0) return;
  if (updatedSSID == currentSSID && updatedPassword == currentPassword) return;

  Serial.println("[Wi-Fi] Applying updated network settings from WattWise.");
  saveWifiCredentials(updatedSSID, updatedPassword);
  WiFi.disconnect(true);
  delay(250);
  connectToWifi();
}

void syncCredentialsFromResponse(const String &body) {
  DynamicJsonDocument response(512);
  const DeserializationError error = deserializeJson(response, body);
  if (error) {
    Serial.printf("[HTTP] Response JSON parse failed: %s\n",
                  error.c_str());
    return;
  }
  syncWifiCredentials(response.as<JsonVariantConst>());
}

bool readSensor(float &voltage, float &current, float &power) {
  voltage = pzem.voltage();
  current = pzem.current();
  power = pzem.power();

  if (!isfinite(voltage) || !isfinite(current) || !isfinite(power) ||
      voltage <= 0.0f || current < 0.0f || power < 0.0f) {
    Serial.println("[PZEM] Invalid sensor values; reading was not uploaded.");
    return false;
  }
  return true;
}

void sendReading() {
  if (WiFi.status() != WL_CONNECTED) return;

  float voltage;
  float current;
  float power;
  if (!readSensor(voltage, current, power)) return;

  HTTPClient http;
  if (!http.begin(secureClient, ingestUrl())) {
    Serial.println("[Ingest] Could not initialize HTTPS request.");
    return;
  }

  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);
  DynamicJsonDocument reading(256);
  reading["voltage"] = voltage;
  reading["current"] = current;
  reading["power"] = power;
  String body;
  serializeJson(reading, body);

  const int status = http.POST(body);
  if (status >= 200 && status < 300) {
    syncCredentialsFromResponse(http.getString());
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
      syncWifiCredentials(response.as<JsonVariantConst>());
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

  loadWifiCredentials();

  // setInsecure() disables TLS certificate verification. Configure a trusted
  // CA certificate on secureClient for production deployments.
  secureClient.setInsecure();

  if (connectToWifi()) {
    syncRelayWithServer();
  }
}

void loop() {
  if (setupPortalActive) {
    dnsServer.processNextRequest();
    setupServer.handleClient();
    delay(2);
    return;
  }

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
