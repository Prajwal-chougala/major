import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    powerLimit: 1000,
    autoOffMinutes: 5,
    alertPhone: "",
    wifiSSID: "",
    wifiPassword: "",
  });
  const [testingAlertId, setTestingAlertId] = useState(null);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [selectedWifiDevice, setSelectedWifiDevice] = useState(null);
  const [wifiForm, setWifiForm] = useState({ wifiSSID: "", wifiPassword: "" });
  const [savingWifi, setSavingWifi] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [testAlertModal, setTestAlertModal] = useState(null);
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [copiedApiKeyDeviceId, setCopiedApiKeyDeviceId] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const openWifiModal = (device) => {
    setSelectedWifiDevice(device);
    setWifiForm({
      wifiSSID: device.wifiSSID || "",
      wifiPassword: device.wifiPassword || "",
    });
    setShowWifiModal(true);
  };

  const saveWifiCredentials = async (e) => {
    e.preventDefault();
    if (!selectedWifiDevice) return;
    try {
      setSavingWifi(true);
      const res = await API.put(
        `/devices/${selectedWifiDevice.deviceId}/wifi`,
        wifiForm
      );
      alert(
        res.data.message ||
          "Wi-Fi credentials updated! The device will automatically fetch them."
      );
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === selectedWifiDevice.deviceId
            ? {
                ...d,
                wifiSSID: wifiForm.wifiSSID,
                wifiPassword: wifiForm.wifiPassword,
              }
            : d
        )
      );
      setShowWifiModal(false);
    } catch (error) {
      console.error("Error updating Wi-Fi:", error);
      alert(
        error.response?.data?.message ||
          "Failed to update Wi-Fi credentials. Check connection."
      );
    } finally {
      setSavingWifi(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await API.get("/devices");
      setDevices(res.data.devices || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching devices:", error);
      setLoading(false);
    }
  };

  const sendTestAlert = async (deviceId) => {
    try {
      setTestingAlertId(deviceId);
      const res = await API.post(`/devices/${deviceId}/test-sms`);
      const dev = devices.find((d) => d.deviceId === deviceId);
      setTestAlertModal({
        success: true,
        message: res.data.message,
        targetPhone: res.data.targetPhone,
        sid: res.data.sid,
        deviceName: dev?.name || "Smart Energy Monitor",
      });
    } catch (error) {
      console.error("Error sending test alert:", error);
      const dev = devices.find((d) => d.deviceId === deviceId);
      setTestAlertModal({
        success: false,
        message:
          error.response?.data?.message ||
          error.response?.data?.reason ||
          "Fast2SMS could not accept the test SMS.",
        targetPhone: error.response?.data?.targetPhone || dev?.alertPhone || "N/A",
        deviceName: dev?.name || "Smart Energy Monitor",
      });
    } finally {
      setTestingAlertId(null);
    }
  };

  const toggleDevice = async (id, currentState) => {
    try {
      // Optimistic UI update
      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          d.deviceId === id
            ? { ...d, powerState: currentState === "ON" ? "OFF" : "ON" }
            : d
        )
      );

      if (currentState === "ON") {
        await API.post(`/devices/${id}/turn-off`).catch((e) =>
          console.log("API Failed but updating UI locally")
        );
      } else {
        await API.post(`/devices/${id}/turn-on`).catch((e) =>
          console.log("API Failed but updating UI locally")
        );
      }
    } catch (error) {
      console.error("Error toggling device:", error);
    }
  };

  const deleteDevice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this device?")) return;
    try {
      await API.delete(`/devices/${id}`).catch((e) =>
        console.log("API Failed but updating UI locally")
      );
      setDevices(devices.filter((d) => d.deviceId !== id));
    } catch (error) {
      console.error("Error deleting device:", error);
    }
  };

  const regenerateKey = async (id) => {
    if (
      !window.confirm(
        "Regenerating the API key will immediately invalidate the old one. Continue?"
      )
    )
      return;
    try {
      const res = await API.post(`/devices/${id}/regenerate-key`);
      setDevices((prevDevices) =>
        prevDevices.map((d) =>
          d.deviceId === id ? { ...d, apiKey: res.data.apiKey } : d
        )
      );
    } catch (error) {
      console.error("Error regenerating key:", error);
      alert(
        error.response?.data?.message ||
          "Could not regenerate the API key. Please try again."
      );
    }
  };

  const copyApiKey = async (device) => {
    if (!device.apiKey) return;

    try {
      await navigator.clipboard.writeText(device.apiKey);
      setCopiedApiKeyDeviceId(device.deviceId);
      window.setTimeout(() => setCopiedApiKeyDeviceId(null), 2000);
    } catch (error) {
      console.error("Error copying device API key:", error);
      alert("Could not copy the API key. Check browser clipboard permissions.");
    }
  };

  const addDevice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newDevice,
        deviceId:
          "dev-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      };
      const res = await API.post("/devices", payload);
      setDevices([...devices, res.data.device]);
      setShowAddModal(false);
      setNewDevice({
        name: "",
        powerLimit: 1000,
        autoOffMinutes: 5,
        alertPhone: "",
        wifiSSID: "",
        wifiPassword: "",
      });
    } catch (error) {
      console.error("Error adding device:", error);
      alert("Failed to add device. Please try again.");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen bg-slate-50 text-[#0EA5E9]">
            <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen px-6 py-12 mx-auto bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-inter transition-colors duration-300">
        <div className="flex flex-col w-full gap-8">
          <div className="flex items-end justify-between w-full">
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-[#0EA5E9] font-bold text-[10px] tracking-widest uppercase">
                SYSTEM INVENTORY
              </span>
              <h1 className="font-display-lg text-slate-900 dark:text-white font-extrabold tracking-tight">
                Connected Devices
              </h1>
            </div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-[#35259B] to-[#0EA5E9] hover:from-[#2143B8] hover:to-[#0EA5E9] text-white px-6 py-3 rounded-full shadow-md shadow-sky-500/10 hover:shadow-sky-500/25 transition-all duration-300 active:scale-95 group">
              <span className="material-symbols-outlined">
                add
              </span>
              <span className="font-label-caps tracking-wider text-xs font-bold">
                ADD DEVICE
              </span>
            </button>
          </div>

          {showAddModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Register New Node</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form onSubmit={addDevice} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">DEVICE NAME</label>
                    <input type="text" required value={newDevice.name} onChange={e => setNewDevice({...newDevice, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-800 dark:text-white focus:border-[#0EA5E9] outline-none transition-all placeholder:text-slate-400 text-sm" placeholder="e.g. Nexus HVAC Core" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">POWER LIMIT (WATTS)</label>
                    <input type="number" required min="1" value={newDevice.powerLimit} onChange={e => setNewDevice({...newDevice, powerLimit: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-800 dark:text-white focus:border-[#0EA5E9] outline-none transition-all text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 tracking-wider">AUTO-OFF MINUTES</label>
                    <input type="number" min="0" value={newDevice.autoOffMinutes} onChange={e => setNewDevice({...newDevice, autoOffMinutes: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-800 dark:text-white focus:border-[#0EA5E9] outline-none transition-all text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider flex items-center justify-between">
                      <span>SMS ALERT NUMBER</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">⚡ Instant Alerts</span>
                    </label>
                    <input 
                      type="tel" 
                      value={newDevice.alertPhone} 
                      onChange={e => setNewDevice({...newDevice, alertPhone: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all placeholder:text-slate-400" 
                      placeholder="+91 98803 31429 (or leave blank to use your profile number)" 
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Enter a 10-digit Indian number or +91 number. Leave blank to use your profile mobile number.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 tracking-wider">WIFI SSID (OPTIONAL)</label>
                      <input 
                        type="text" 
                        value={newDevice.wifiSSID} 
                        onChange={e => setNewDevice({...newDevice, wifiSSID: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all placeholder:text-slate-400 text-xs font-mono" 
                        placeholder="e.g. Home_WiFi" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 tracking-wider">WIFI PASSWORD</label>
                      <input 
                        type="password" 
                        value={newDevice.wifiPassword} 
                        onChange={e => setNewDevice({...newDevice, wifiPassword: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all placeholder:text-slate-400 text-xs font-mono" 
                        placeholder="Password" 
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-slate-100">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-full text-slate-400 font-bold tracking-wider hover:bg-slate-100 transition-colors text-xs">CANCEL</button>
                    <button type="submit" className="px-8 py-3 rounded-full bg-gradient-to-r from-[#35259B] to-[#0EA5E9] text-white font-bold tracking-wider hover:opacity-90 transition-all shadow-md shadow-sky-500/10 text-xs">REGISTER</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showWifiModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0EA5E9]">
                      <span className="material-symbols-outlined text-2xl">wifi</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">ESP32 Wi-Fi Settings</h2>
                      <p className="text-xs text-slate-500 font-medium">Device: {selectedWifiDevice?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowWifiModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={saveWifiCredentials} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">WIFI NETWORK NAME (SSID)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required 
                        value={wifiForm.wifiSSID} 
                        onChange={e => setWifiForm({...wifiForm, wifiSSID: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pl-10 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all placeholder:text-slate-400 font-mono text-sm" 
                        placeholder="e.g. Redmi 13 5G or Home_WiFi" 
                      />
                      <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 text-lg">router</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">WIFI PASSWORD</label>
                    <div className="relative">
                      <input 
                        type={showWifiPassword ? "text" : "password"} 
                        value={wifiForm.wifiPassword} 
                        onChange={e => setWifiForm({...wifiForm, wifiPassword: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pl-10 pr-10 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all placeholder:text-slate-400 font-mono text-sm" 
                        placeholder="Leave empty if open network" 
                      />
                      <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 text-lg">key</span>
                      <button 
                        type="button" 
                        onClick={() => setShowWifiPassword(!showWifiPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showWifiPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Dual Mode Fallback Guide */}
                  <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 text-xs text-sky-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#0EA5E9] text-base mt-0.5">cloud_sync</span>
                      <div>
                        <strong className="text-slate-800">Online Auto-Sync:</strong> When ESP32 is powered on and online, saving updates the device immediately. It writes to flash memory and switches networks without manual flashing.
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-base mt-0.5">wifi_tethering</span>
                      <div>
                        <strong className="text-slate-800">If Router Password was already changed:</strong> If the ESP32 can't connect for 20s, it launches its built-in Hotspot: <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 text-[#35259B] font-mono">WattWise-Setup</code>. Connect to it on your phone and open <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 text-[#35259B] font-mono">192.168.4.1</code> to reconfigure!
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setShowWifiModal(false)} 
                      className="px-5 py-2.5 rounded-full text-slate-400 font-bold tracking-wider hover:bg-slate-100 transition-colors text-xs"
                    >
                      CANCEL
                    </button>
                    <button 
                      type="submit" 
                      disabled={savingWifi}
                      className="px-7 py-2.5 rounded-full bg-gradient-to-r from-[#35259B] to-[#0EA5E9] text-white font-bold tracking-wider hover:opacity-90 transition-all shadow-md shadow-sky-500/10 text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingWifi ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                          SAVING...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">save</span>
                          SAVE & PUSH TO ESP32
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {testAlertModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl animate-scale-in text-slate-800 dark:text-slate-100">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                      testAlertModal.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                    }`}>
                      <span className="material-symbols-outlined text-2xl">
                        {testAlertModal.success ? 'send' : 'warning'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        {testAlertModal.success ? 'Test SMS Accepted' : 'SMS Sending Failed'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Device: <strong className="text-slate-700 dark:text-slate-200">{testAlertModal.deviceName}</strong>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTestAlertModal(null)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                {/* Recipient Details */}
                <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 mb-5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Target Recipient:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                      {testAlertModal.targetPhone}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">SMS provider:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Fast2SMS</span>
                  </div>
                  {testAlertModal.sid && (
                    <div className="flex justify-between items-center text-xs border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Fast2SMS request ID:</span>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {testAlertModal.sid}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Message */}
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed mb-6 ${
                  testAlertModal.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}>
                  <p className="font-semibold mb-1">
                    {testAlertModal.success ? 'Fast2SMS accepted the message; delivery may take a moment:' : 'SMS error:'}
                  </p>
                  <p>{testAlertModal.message}</p>
                </div>

                {/* Modal Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    type="button"
                    onClick={() => setTestAlertModal(null)}
                    className="py-3 px-5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider transition-all text-center"
                  >
                    CLOSE
                  </button>
                </div>

              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-gutter relative">
            <div className="col-span-12 flex flex-col gap-6">
              {Array.isArray(devices) && devices.map((device, index) => (
                <div key={device.deviceId} className="group relative z-10">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 h-full flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center relative overflow-hidden transition-all ${device.powerState === 'ON' ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-800 text-[#35259B] dark:text-indigo-400 shadow-[0_0_15px_rgba(53,37,155,0.15)]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                          <span
                            className="material-symbols-outlined text-3xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            settings_input_component
                          </span>
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {device.name}
                          </h2>
                          <div className="font-data-mono text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${device.powerState === 'ON' ? 'bg-[#0EA5E9] animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]' : 'bg-slate-200 dark:bg-slate-700'}`}></span>
                            <span>API key:</span>
                            {device.apiKey ? (
                              <>
                                <code className="max-w-full break-all rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-700 dark:text-slate-200 select-all">
                                  {device.apiKey}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => copyApiKey(device)}
                                  className="inline-flex items-center gap-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-800"
                                  aria-label={`Copy API key for ${device.name}`}
                                  title="Copy API key"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {copiedApiKeyDeviceId === device.deviceId
                                      ? "check"
                                      : "content_copy"}
                                  </span>
                                  {copiedApiKeyDeviceId === device.deviceId
                                    ? "Copied"
                                    : "Copy"}
                                </button>
                              </>
                            ) : (
                              <span>Unavailable — regenerate the key to view it.</span>
                            )}
                            {device.alertPhone && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                                <span className="material-symbols-outlined text-[13px]">chat</span>
                                {device.alertPhone}
                              </span>
                            )}
                            {device.wifiSSID && (
                              <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold text-[11px] flex items-center gap-1 border border-sky-200 dark:border-sky-800" title="Configured Wi-Fi Network">
                                <span className="material-symbols-outlined text-[13px]">wifi</span>
                                {device.wifiSSID}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className={`px-4 py-1.5 rounded-full font-label-caps text-[10px] font-bold flex items-center gap-2 border ${device.powerState === 'ON' ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                          <span className="material-symbols-outlined text-sm">
                            power_settings_new
                          </span>{" "}
                          {device.powerState === 'ON' ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
                      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-5 flex flex-col gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                        <span className="font-label-caps text-slate-400 dark:text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                          POWER LIMIT
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-3xl font-extrabold font-mono ${device.powerState === 'ON' ? 'text-[#0EA5E9]' : 'text-slate-400 dark:text-slate-600'}`}>
                            {device.powerLimit || 'N/A'}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            W
                          </span>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-5 flex flex-col gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                        <span className="font-label-caps text-slate-400 dark:text-slate-500 font-bold text-[10px] tracking-wider uppercase">
                          AUTO-OFF TIMER
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-3xl font-extrabold font-mono ${device.powerState === 'ON' ? 'text-[#35259B] dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}>
                            {device.autoOffMinutes || '--'}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            Mins
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-6 gap-3 relative z-10">
                      <div className="flex flex-wrap items-center gap-2">
                        <button 
                          onClick={() => sendTestAlert(device.deviceId)} 
                          disabled={testingAlertId === device.deviceId}
                          className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 font-label-caps text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                          title="Send a real SMS test to this device's alert number"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {testingAlertId === device.deviceId ? 'sync' : 'notification_important'}
                          </span>{" "}
                          {testingAlertId === device.deviceId ? 'SENDING...' : 'TEST SMS'}
                        </button>
                        <button 
                          onClick={() => openWifiModal(device)}
                          className="px-3 py-1.5 rounded-lg border border-sky-300 text-sky-700 bg-sky-50/50 hover:bg-sky-100 font-label-caps text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                          title="Update ESP32 Wi-Fi SSID and Password"
                        >
                          <span className="material-symbols-outlined text-sm">
                            wifi
                          </span>{" "}
                          WI-FI SETTINGS
                        </button>
                        <button onClick={() => regenerateKey(device.deviceId)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-label-caps text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">
                            refresh
                          </span>{" "}
                          REGENERATE KEY
                        </button>
                        <button onClick={() => deleteDevice(device.deviceId)} className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 font-label-caps text-[10px] font-bold hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 transition-colors flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">
                            delete
                          </span>{" "}
                          DELETE
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            checked={device.powerState === 'ON'}
                            onChange={() => toggleDevice(device.deviceId, device.powerState)}
                            className="sr-only peer"
                            type="checkbox"
                          />
                          <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#35259B] shadow-inner border border-slate-300 dark:border-slate-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!devices || devices.length === 0) && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                   <h3 className="font-title-md text-slate-900 dark:text-white font-bold mb-2">No Devices Registered</h3>
                   <p className="font-body-md text-slate-500 dark:text-slate-400">Click 'Add Device' to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Devices;
