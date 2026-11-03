# WattWise

WattWise is a React dashboard and Node/Express API for monitoring ESP32/PZEM
power readings, estimating energy costs, managing device relays, and notifying
users about configured energy and instantaneous-power limits.

## Features

- Account authentication and owner-scoped device management.
- Hardware API keys, visible and copyable by the owning user; regeneration
  immediately invalidates the previous key.
- Per-device daily energy limit (`powerLimit`, kWh). Reaching this existing
  limit preserves its immediate auto-off behavior.
- Separate instantaneous power threshold (`powerThresholdW`, W). A reading at
  or above the limit creates an in-app alert and sends one SMS for that
  continuous event. A countdown starts; dropping below the limit cancels it
  and allows a later crossing to alert again.
- Device-specific SMS recipient with fallback to the account mobile number.
- Fast2SMS Quick SMS integration, test-SMS endpoints, Arduino-configured Wi-Fi,
  and server-controlled relay state.
- Energy, dashboard, alert, analytics, and power-chart APIs.

## Backend setup

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `RATE_PER_KWH` in
`backend/.env`. `RATE_PER_KWH` is a configurable flat-rate estimate; actual
electricity tariffs vary by region and billing plan. The API also returns a
30-day cost projection based on that configured rate.

Configure Fast2SMS by setting `FAST2SMS_API_KEY` in the backend environment.
Never put this key in a frontend environment variable or commit it. An
administrator may set or replace the key from **Settings → SMS alerts**; that
runtime change lasts only until the server restarts, so use the hosting
provider's environment settings for persistence. The status endpoint returns
only whether the provider is configured, never the key.

Promote a trusted account to administrator through your database administration
process by setting its user `role` to `admin`. Only administrators can change
the provider key; authenticated users can send a test SMS to their own saved
mobile number.

```powershell
npm start
```

Run backend unit tests with `npm test`. To send a real test message manually,
set `TEST_SMS_NUMBER` in the backend environment and run `npm run test:sms`.
Fast2SMS acceptance means the provider accepted the request; it does not
guarantee delivery to the phone.

## Frontend setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_URL` to the backend origin in `frontend/.env` (for example,
`http://localhost:5000`) and set the same variable in the frontend hosting
environment for production. The API URL is not embedded in the application
code or Vercel rewrites.

## API and device configuration

Authenticated user endpoints include:

- `GET /settings` — profile and non-secret SMS configuration status.
- `PUT /settings/profile` — update the account name and Indian mobile number.
- `PUT /settings/sms` — administrator-only Fast2SMS key configuration.
- `POST /settings/test-sms` — send a test message to the user's saved mobile.
- `PUT /devices/:deviceId` — update the energy and watt thresholds, auto-off
  delay, and optional per-device SMS recipient.
- `POST /devices/:deviceId/test-sms` — send a test to the device recipient or
  account fallback number.
- `POST /devices/:deviceId/regenerate-key` — replace the hardware API key.

The hardware uses its `x-api-key` header:

- `POST /ingest` accepts voltage, current, and power. It also stores optional
  `energy`, `frequency`, `powerFactor`, and `timestamp` fields.
- `GET /ingest/status` returns the server's `powerState` for relay control.

When adding an appliance, the daily energy threshold remains measured in kWh.
The instantaneous power alert is a separate optional value in watts, with a
per-device auto-off delay. Leave either value blank to disable that threshold.
Set the optional SMS recipient as a 10-digit Indian number or `+91` number;
otherwise WattWise uses the account mobile.

## ESP32, PZEM, and relay

The adapted sketch is [esp32/WattWise_ESP32.ino](./esp32/WattWise_ESP32.ino).
It targets an ESP32, PZEM-004T v3.0, and an active-low relay:

- PZEM UART2 RX: GPIO 16; TX: GPIO 17.
- Relay: GPIO 5.
- Install the ArduinoJson and PZEM004Tv30 libraries.
- Enter your Wi-Fi SSID and password directly in the sketch's `WIFI_SSID` and
  `WIFI_PASSWORD` definitions, along with the backend URL and device API key.
  Obtain a device API key from the authenticated Devices page. Wi-Fi
  credentials are no longer configured from the Devices UI.
- The ESP32 connects only to a 2.4 GHz Wi-Fi network. If the network changes,
  update the credentials in the sketch and upload it again.
- The sketch currently calls `setInsecure()`, which disables TLS certificate
  verification. This is not suitable for production; configure a trusted CA
  certificate on `WiFiClientSecure` before deployment.

Sensor failures are skipped by the firmware instead of being uploaded as
plausible zero readings. The backend rejects invalid numeric sensor values.

## Source branch and credential hygiene

The Lapin storefront in the source branch is a separate application and is not
part of this WattWise repository; its Shopify configuration and UI remain
isolated.

The source firmware contains committed Wi-Fi credentials and a setup-network
password. Those values were deliberately not copied. Rotate the affected
network credentials and change the setup-network password if those source
values were ever active. The adapted sketch contains placeholders only.
