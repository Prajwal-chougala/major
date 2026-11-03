/*
   WattWise - ESP32 + PZEM-004T V3.0 + Relay (Smart Wi-Fi Sync & Offline Portal)
   
   Hardware:
   - ESP32 Development Board
   - PZEM-004T V3.0 Energy Monitor (Serial2: RX=16, TX=17)
   - 1-Channel Relay Module (GPIO 5, Active-LOW)
   
   Features:
   1. Real-time Energy Monitoring (Voltage, Current, Power, Energy, Frequency, PF).
   2. Instant Cloud Relay Toggle (ON/OFF) via /ingest/status.
   3. Remote Wi-Fi Update (Cloud Sync): Changing Wi-Fi on the website updates the ESP32 in real-time.
   4. Offline Fallback Hotspot: If router password was changed while ESP32 was off, ESP32 turns on
      "WattWise-Setup" hotspot (192.168.4.1) so you can enter the new Wi-Fi password from your phone!
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <Preferences.h>
#include <WebServer.h>
#include <DNSServer.h>

// =====================================================
// Optional fallback Wi-Fi credentials. Leave blank to use the setup hotspot.
// =====================================================
const char* DEFAULT_WIFI_SSID = "";
const char* DEFAULT_WIFI_PASSWORD = "";

// Server Endpoints
const char* SERVER_URL = "https://major-mobh.onrender.com/ingest";
const char* STATUS_URL = "https://major-mobh.onrender.com/ingest/status";
const char* DEVICE_API_KEY = "REPLACE_WITH_DEVICE_API_KEY";

// =====================================================
// HARDWARE PIN DEFINITIONS
// =====================================================
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17
#define RELAY_PIN 5
const bool RELAY_ACTIVE_LOW = true;

// =====================================================
// GLOBALS & OBJECTS
// =====================================================
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
WiFiClientSecure secureClient;
Preferences preferences;

// Captive Portal WebServer & DNS
WebServer apServer(80);
DNSServer dnsServer;
const byte DNS_PORT = 53;
bool apModeActive = false;

// Active Wi-Fi runtime storage
String currentSSID = "";
String currentPassword = "";
bool relayEnergized = false;

// Timing intervals
unsigned long lastReadingTime = 0;
unsigned long lastStatusTime = 0;
const unsigned long READING_INTERVAL = 7000; // 7 seconds
const unsigned long STATUS_INTERVAL = 3000;  // 3 seconds

// =====================================================
// PREFERENCES (FLASH NVS STORAGE)
// =====================================================
void loadSavedCredentials() {
  preferences.begin("wattwise", false);
  currentSSID = preferences.getString("ssid", DEFAULT_WIFI_SSID);
  currentPassword = preferences.getString("password", DEFAULT_WIFI_PASSWORD);
  preferences.end();
  Serial.printf("[Flash] Loaded Wi-Fi SSID: %s\n", currentSSID.c_str());
}

void saveWifiCredentials(const String& newSsid, const String& newPass) {
  preferences.begin("wattwise", false);
  preferences.putString("ssid", newSsid);
  preferences.putString("password", newPass);
  preferences.end();
  currentSSID = newSsid;
  currentPassword = newPass;
  Serial.printf("[Flash] Saved new Wi-Fi credentials: %s\n", newSsid.c_str());
}

// =====================================================
// RELAY CONTROL
// =====================================================
void setRelay(bool energize) {
  relayEnergized = energize;
  bool pinLevel = RELAY_ACTIVE_LOW ? !energize : energize;
  digitalWrite(RELAY_PIN, pinLevel);
  Serial.printf("[Relay] Power state set to: %s\n", energize ? "ON" : "OFF");
}

// =====================================================
// OFFLINE CAPTIVE PORTAL SETUP
// =====================================================
void handleAPRoot() {
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>WattWise Setup</title><style>";
  html += "body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; text-align: center; }";
  html += ".card { background: #1e293b; border-radius: 16px; padding: 24px; max-width: 400px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }";
  html += "h1 { color: #38bdf8; margin-bottom: 8px; }";
  html += "p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }";
  html += "input { width: 100%; box-sizing: border-box; padding: 12px; margin: 8px 0 16px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; }";
  html += "button { width: 100%; background: linear-gradient(135deg, #35259B, #0EA5E9); border: none; color: white; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; }";
  html += "</style></head><body>";
  html += "<div class='card'><h1>WattWise Wi-Fi Setup</h1>";
  html += "<p>Enter your new router credentials to reconnect your monitor.</p>";
  html += "<form method='POST' action='/save'>";
  html += "<div style='text-align:left;'><label>Wi-Fi Name (SSID):</label></div>";
  html += "<input type='text' name='ssid' value='" + currentSSID + "' required>";
  html += "<div style='text-align:left;'><label>Wi-Fi Password:</label></div>";
  html += "<input type='password' name='password' placeholder='Enter password'>";
  html += "<button type='submit'>Save & Reconnect</button>";
  html += "</form></div></body></html>";
  apServer.send(200, "text/html", html);
}

void handleAPSave() {
  String newSsid = apServer.arg("ssid");
  String newPass = apServer.arg("password");

  if (newSsid.length() > 0) {
    saveWifiCredentials(newSsid, newPass);
    String confirm = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>";
    confirm += "<style>body{font-family:sans-serif;background:#0f172a;color:#fff;text-align:center;padding:40px;}</style></head>";
    confirm += "<body><h2>Wi-Fi Saved!</h2><p>ESP32 is restarting and connecting to <b>" + newSsid + "</b>...</p></body></html>";
    apServer.send(200, "text/html", confirm);
    delay(2000);
    ESP.restart();
  } else {
    apServer.send(400, "text/plain", "SSID cannot be empty.");
  }
}

void startCaptivePortal() {
  apModeActive = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP("WattWise-Setup", "wattwise123");

  IPAddress apIP = WiFi.softAPIP();
  Serial.print("[AP] Hotspot 'WattWise-Setup' started. IP: ");
  Serial.println(apIP);

  // Redirect all DNS requests to local AP IP
  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(DNS_PORT, "*", apIP);

  // Serve Captive Portal Web Page
  apServer.on("/", HTTP_GET, handleAPRoot);
  apServer.on("/save", HTTP_POST, handleAPSave);
  apServer.onNotFound(handleAPRoot); // Redirect any other URL to setup page
  apServer.begin();

  Serial.println("[AP] Connect your phone/PC to 'WattWise-Setup' (Password: wattwise123)");
  Serial.println("[AP] Open http://192.168.4.1 in your browser to update Wi-Fi credentials.");
}

// =====================================================
// WIFI CONNECTION ROUTINE
// =====================================================
void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  if (currentSSID.length() == 0) {
    Serial.println("[WiFi] No saved network. Starting setup hotspot...");
    startCaptivePortal();
    return;
  }

  WiFi.begin(currentSSID.c_str(), currentPassword.c_str());
  Serial.printf("Connecting to Wi-Fi: %s", currentSSID.c_str());

  unsigned long startAttemptTime = millis();
  // 20-second timeout before starting offline setup AP
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
    apModeActive = false;
  } else {
    Serial.println("\n[WiFi] Failed to connect within 20s.");
    Serial.println("[WiFi] Starting Offline Configuration Portal...");
    startCaptivePortal();
  }
}

// =====================================================
// READ PZEM DATA
// =====================================================
bool readPZEM(float &voltage, float &current, float &power, float &energy, float &frequency, float &pf) {
  voltage   = pzem.voltage();
  current   = pzem.current();
  power     = pzem.power();
  energy    = pzem.energy();
  frequency = pzem.frequency();
  pf        = pzem.pf();

  if (!isfinite(voltage) || !isfinite(current) || !isfinite(power)) {
    return false;
  }

  // The backend stores voltage, current, and power. These other values are
  // kept for local diagnostics only.
  if (!isfinite(energy))    energy = 0.0;
  if (!isfinite(frequency)) frequency = 0.0;
  if (!isfinite(pf))        pf = 0.0;

  return true;
}

void syncWifiCredentials(const char* serverSsid, const char* serverPass) {
  if (serverSsid == NULL || strlen(serverSsid) == 0) {
    return;
  }

  String targetSsid = serverSsid;
  String targetPassword = serverPass != NULL ? serverPass : "";

  if (targetSsid == currentSSID && targetPassword == currentPassword) {
    return;
  }

  Serial.printf("[Cloud Sync] Applying Wi-Fi settings for network: %s\n", serverSsid);
  saveWifiCredentials(targetSsid, targetPassword);
  delay(1000);
  ESP.restart();
}

// =====================================================
// SEND DATA TO SERVER
// =====================================================
void sendReading() {
  float voltage, current, power, energy, frequency, pf;
  if (!readPZEM(voltage, current, power, energy, frequency, pf)) {
    Serial.println("[PZEM] Invalid voltage/current/power reading; skipping upload.");
    return;
  }

  Serial.println("\n------ PZEM SENSOR READINGS ------");
  Serial.printf("Voltage:      %.1f V\n", voltage);
  Serial.printf("Current:      %.2f A\n", current);
  Serial.printf("Active Power: %.1f W\n", power);
  Serial.printf("Energy:       %.3f kWh\n", energy);
  Serial.printf("Frequency:    %.1f Hz\n", frequency);
  Serial.printf("Power Factor: %.2f\n", pf);

  HTTPClient http;
  if (!http.begin(secureClient, SERVER_URL)) {
    Serial.println("[Ingest] Unable to initialize HTTPS request.");
    return;
  }
  http.setConnectTimeout(10000);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);

  StaticJsonDocument<192> doc;
  doc["voltage"] = voltage;
  doc["current"] = current;
  doc["power"]   = power;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  Serial.printf("[Ingest] POST /ingest Response Code: %d\n", httpCode);

  if (httpCode == 201 || httpCode == 200) {
    String resp = http.getString();
    StaticJsonDocument<512> respDoc;
    DeserializationError error = deserializeJson(respDoc, resp);
    if (error) {
      Serial.printf("[Ingest] Response JSON parse error: %s\n", error.c_str());
    } else {
      syncWifiCredentials(respDoc["wifiSSID"], respDoc["wifiPassword"]);
    }
  } else if (httpCode < 0) {
    Serial.printf("[Ingest] Request failed: %s\n", http.errorToString(httpCode).c_str());
  } else {
    Serial.printf("[Ingest] Server rejected reading: %s\n", http.getString().c_str());
  }

  http.end();
}

// =====================================================
// GET RELAY STATUS & CLOUD WI-FI SYNC
// =====================================================
void syncRelayWithServer() {
  HTTPClient http;
  if (!http.begin(secureClient, STATUS_URL)) {
    Serial.println("[Status] Unable to initialize HTTPS request.");
    return;
  }
  http.setConnectTimeout(10000);
  http.setTimeout(10000);
  http.addHeader("x-api-key", DEVICE_API_KEY);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      // 1. Sync Relay State
      const char* powerState = doc["powerState"];
      if (powerState != NULL) {
        bool shouldBeOn = (strcmp(powerState, "ON") == 0);
        if (shouldBeOn != relayEnergized) {
          setRelay(shouldBeOn);
        }
      }

      // 2. Apply cloud Wi-Fi changes, including password-only updates.
      syncWifiCredentials(doc["wifiSSID"], doc["wifiPassword"]);
    } else {
      Serial.printf("[Status] JSON Parse Error: %s\n", error.c_str());
    }
  } else if (httpCode < 0) {
    Serial.printf("[Status] Request failed: %s\n", http.errorToString(httpCode).c_str());
  } else {
    Serial.printf("[Status] Server rejected status request (HTTP %d): %s\n",
                  httpCode, http.getString().c_str());
  }

  http.end();
}

// =====================================================
// SETUP & LOOP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("=========================================");
  Serial.println("       WATTWISE SMART ENERGY NODE        ");
  Serial.println("=========================================");

  // Setup Relay Pin
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false); // Default OFF on boot until synced

  // Load saved Wi-Fi from non-volatile flash memory
  loadSavedCredentials();

  // Allow Insecure SSL (Render uses valid HTTPS, setInsecure skips CA bundle)
  secureClient.setInsecure();

  // Attempt Wi-Fi connection with timeout
  connectToWiFi();

  if (!apModeActive) {
    // Initial sync with WattWise cloud server
    syncRelayWithServer();
  }
}

void loop() {
  // If in Offline AP Mode, handle client requests
  if (apModeActive) {
    dnsServer.processNextRequest();
    apServer.handleClient();
    return;
  }

  // If Wi-Fi dropped while running
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Lost connection. Attempting reconnect...");
    WiFi.reconnect();
    unsigned long reconnectStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - reconnectStart < 15000) {
      delay(500);
      Serial.print(".");
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\n[WiFi] Reconnect failed. Starting offline setup hotspot...");
      startCaptivePortal();
      return;
    }
    Serial.println("\n[WiFi] Reconnected!");
  }

  unsigned long currentTime = millis();

  // 1. Send PZEM Sensor Reading every 7 seconds
  if (currentTime - lastReadingTime >= READING_INTERVAL) {
    lastReadingTime = currentTime;
    sendReading();
  }

  // 2. Poll Remote ON/OFF Relay Command & Wi-Fi Sync every 3 seconds
  if (currentTime - lastStatusTime >= STATUS_INTERVAL) {
    lastStatusTime = currentTime;
    syncRelayWithServer();
  }
}
