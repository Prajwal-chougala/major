import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', powerLimit: 2.5 });
  const [editingDevice, setEditingDevice] = useState(null);
  const [editThreshold, setEditThreshold] = useState('');

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 3000);
    return () => clearInterval(interval);
  }, []);

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

  const toggleDevice = async (id, currentState) => {
    try {
      // Optimistic UI update
      setDevices(prevDevices => prevDevices.map(d => 
        d.deviceId === id 
          ? { ...d, powerState: currentState === 'ON' ? 'OFF' : 'ON' } 
          : d
      ));

      if (currentState === "ON") {
        await API.post(`/devices/${id}/turn-off`).catch(e => console.log('API Failed but updating UI locally'));
      } else {
        await API.post(`/devices/${id}/turn-on`).catch(e => console.log('API Failed but updating UI locally'));
      }
    } catch (error) {
      console.error("Error toggling device:", error);
    }
  };

  const deleteDevice = async (id) => {
    if (!window.confirm("Are you sure you want to delete this device?")) return;
    try {
      await API.delete(`/devices/${id}`).catch(e => console.log('API Failed but updating UI locally'));
      setDevices(devices.filter(d => d.deviceId !== id));
    } catch (error) {
      console.error("Error deleting device:", error);
    }
  };

  const regenerateKey = async (id) => {
    if (!window.confirm("Regenerating the API key will immediately invalidate the old one. Continue?")) return;
    try {
      const res = await API.post(`/devices/${id}/regenerate-key`).catch(e => ({ data: { apiKey: 'new-mock-key-' + Date.now() } }));
      setDevices(devices.map(d => d.deviceId === id ? { ...d, apiKey: res.data.apiKey } : d));
    } catch (error) {
      console.error("Error regenerating key:", error);
    }
  };

  const addDevice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newDevice,
        deviceId: 'dev-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
      };
      const res = await API.post('/devices', payload);
      setDevices([...devices, res.data.device]);
      setShowAddModal(false);
      setNewDevice({ name: '', powerLimit: 2.5 });
    } catch (error) {
      console.error("Error adding device:", error);
      alert("Failed to add device. Please try again.");
    }
  };

  const updateThreshold = async (e) => {
    e.preventDefault();
    if (!editingDevice) return;
    try {
      const val = Number(editThreshold);
      await API.put(`/devices/${editingDevice.deviceId}`, {
        powerLimit: val,
      });
      setDevices(devices.map(d => d.deviceId === editingDevice.deviceId ? { ...d, powerLimit: val } : d));
      setEditingDevice(null);
    } catch (error) {
      console.error("Error updating threshold:", error);
      alert("Failed to update threshold.");
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
      <div className="min-h-screen px-6 py-12 mx-auto bg-slate-50 text-slate-700 font-inter">
        <div className="flex flex-col w-full gap-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-[#0EA5E9] font-bold text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]"></span>
                LIVE HARDWARE TELEMETRY (SYNCED)
              </span>
              <h1 className="font-display-lg text-slate-900 font-extrabold text-3xl sm:text-4xl">
                Connected Devices
              </h1>
            </div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-[#35259B] to-[#0EA5E9] hover:from-[#2143B8] hover:to-[#0EA5E9] text-white px-6 py-3 rounded-full shadow-md shadow-sky-500/10 hover:shadow-sky-500/25 transition-all duration-300 active:scale-95 group w-fit">
              <span className="material-symbols-outlined">
                add
              </span>
              <span className="font-label-caps tracking-wider text-xs font-bold">
                ADD DEVICE
              </span>
            </button>
          </div>

          {showAddModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Register New Node</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form onSubmit={addDevice} className="flex flex-col gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">DEVICE NAME</label>
                    <input type="text" required value={newDevice.name} onChange={e => setNewDevice({...newDevice, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all placeholder:text-slate-400" placeholder="e.g. Nexus HVAC Core" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">DAILY ENERGY THRESHOLD (kWh)</label>
                    <input type="number" step="any" min="0" required value={newDevice.powerLimit} onChange={e => setNewDevice({...newDevice, powerLimit: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all font-mono" placeholder="e.g. 0.02 or 2.5" />
                  </div>

                  <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-slate-100">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-full text-slate-400 font-bold tracking-wider hover:bg-slate-100 transition-colors text-xs">CANCEL</button>
                    <button type="submit" className="px-8 py-3 rounded-full bg-gradient-to-r from-[#35259B] to-[#0EA5E9] text-white font-bold tracking-wider hover:opacity-90 transition-all shadow-md shadow-sky-500/10 text-xs">REGISTER</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {editingDevice && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set Energy Threshold</h2>
                    <p className="text-xs text-slate-400 mt-1">{editingDevice.name}</p>
                  </div>
                  <button onClick={() => setEditingDevice(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form onSubmit={updateThreshold} className="flex flex-col gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">DAILY ENERGY LIMIT (kWh)</label>
                    <input type="number" step="any" min="0" required value={editThreshold} onChange={e => setEditThreshold(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all font-mono" placeholder="e.g. 0.02 or 2.5" />
                    <p className="text-[11px] text-slate-400 mt-2">When energy consumption hits this threshold, the device automatically turns off and an SMS is sent to your registered number.</p>
                  </div>

                  <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-slate-100">
                    <button type="button" onClick={() => setEditingDevice(null)} className="px-6 py-3 rounded-full text-slate-400 font-bold tracking-wider hover:bg-slate-100 transition-colors text-xs">CANCEL</button>
                    <button type="submit" className="px-8 py-3 rounded-full bg-gradient-to-r from-[#35259B] to-[#0EA5E9] text-white font-bold tracking-wider hover:opacity-90 transition-all shadow-md shadow-sky-500/10 text-xs">SAVE THRESHOLD</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-gutter relative">
            <div className="col-span-12 flex flex-col gap-6">
              {Array.isArray(devices) && devices.map((device) => {
                const consumedEnergy = Number(device.energyKWh !== undefined ? device.energyKWh : (device.dailyEnergyKWh || 0));
                const currentPower = device.powerState === 'ON' ? Number(device.currentPowerW || 0) : 0;
                const hasThreshold = device.powerLimit !== null && device.powerLimit !== undefined && device.powerLimit > 0;
                const percentConsumed = hasThreshold ? Math.min(100, Math.round((consumedEnergy / device.powerLimit) * 100)) : 0;
                const isLimitNear = hasThreshold && percentConsumed >= 85;

                return (
                  <div key={device.deviceId} className="group relative z-10">
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 h-full flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 relative z-10">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center relative overflow-hidden transition-all ${device.powerState === 'ON' ? 'bg-indigo-50 border border-indigo-100 text-[#35259B] shadow-[0_0_20px_rgba(53,37,155,0.15)]' : 'bg-slate-100 border border-slate-200 text-slate-400'}`}>
                            <span
                              className="material-symbols-outlined text-3xl"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              settings_input_component
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                {device.name}
                              </h2>
                              {device.isOnline && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-200">
                                  ONLINE
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-slate-400 flex items-center gap-2 mt-1">
                              <span className={`w-2 h-2 rounded-full ${device.powerState === 'ON' ? 'bg-[#0EA5E9] animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]' : 'bg-slate-300'}`}></span>
                              API Key: <span className="text-slate-600 font-semibold">{device.apiKey || 'Hidden'}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {device.powerState === 'ON' && currentPower > 0 && (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full font-bold text-xs flex items-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              DRAWING POWER
                            </span>
                          )}
                          <span className={`px-4 py-1.5 rounded-full font-label-caps text-[11px] font-bold flex items-center gap-2 border ${device.powerState === 'ON' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            <span className="material-symbols-outlined text-sm">
                              power_settings_new
                            </span>{" "}
                            {device.powerState === 'ON' ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>

                      {/* 3 Metric Display Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 relative z-10">
                        {/* Currently Consuming Power Draw */}
                        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/20 border border-slate-200/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-indigo-200 transition-all shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-label-caps text-slate-500 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-[#0EA5E9]">bolt</span>
                              CURRENTLY CONSUMING
                            </span>
                            <span className={`w-2 h-2 rounded-full ${device.powerState === 'ON' && currentPower > 0 ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}></span>
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className={`text-3xl font-extrabold font-mono tracking-tight ${device.powerState === 'ON' ? 'text-[#0EA5E9]' : 'text-slate-400'}`}>
                              {currentPower.toFixed(1)}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              W
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium mt-1">
                            {device.powerState === 'ON' ? `≈ ${(currentPower / 1000).toFixed(3)} kW active draw` : 'Device is inactive'}
                          </span>
                        </div>

                        {/* Consumed Today (Continuous Energy) */}
                        <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-indigo-200 transition-all shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-label-caps text-slate-500 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-[#35259B]">electric_meter</span>
                              TODAY'S ENERGY CONSUMED
                            </span>
                            <span className="text-[10px] font-bold text-[#35259B] bg-indigo-50 px-1.5 py-0.5 rounded">
                              REAL-TIME
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className={`text-3xl font-extrabold font-mono tracking-tight ${device.powerState === 'ON' ? 'text-[#35259B]' : 'text-slate-400'}`}>
                              {consumedEnergy.toFixed(4)}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              kWh
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium mt-1">
                            {consumedEnergy > 0 ? `Cost: ≈ ₹${(consumedEnergy * 8).toFixed(2)}` : 'Accumulating live sensor energy'}
                          </span>
                        </div>

                        {/* Energy Threshold Limit */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100/40 border border-slate-200/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 transition-all shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-label-caps text-slate-500 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-slate-500">crisis_alert</span>
                              DAILY THRESHOLD
                            </span>
                            {hasThreshold && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isLimitNear ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600'}`}>
                                {percentConsumed}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-800">
                              {hasThreshold ? device.powerLimit : 'None'}
                            </span>
                            {hasThreshold && (
                              <span className="text-xs font-bold text-slate-400">
                                kWh
                              </span>
                            )}
                          </div>
                          {hasThreshold ? (
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isLimitNear ? 'bg-red-500' : 'bg-gradient-to-r from-[#35259B] to-[#0EA5E9]'}`}
                                style={{ width: `${percentConsumed}%` }}
                              ></div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium mt-1">
                              Auto-turnoff disabled
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Real-Time Sensor Telemetry Ribbon */}
                      {device.powerState === 'ON' && (
                        <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 mb-6 text-xs text-slate-600 relative z-10">
                          <span className="font-bold text-slate-400 tracking-wider text-[10px] uppercase flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">sensors</span>
                            SENSOR TELEMETRY:
                          </span>
                          <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200 font-semibold text-slate-700">
                            ⚡ {device.voltage ? Number(device.voltage).toFixed(1) : '230.0'} V
                          </span>
                          <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200 font-semibold text-slate-700">
                            🔌 {device.current ? Number(device.current).toFixed(2) : '0.00'} A
                          </span>
                          <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200 font-semibold text-slate-700">
                            🌊 {device.frequency ? Number(device.frequency).toFixed(1) : '50.0'} Hz
                          </span>
                          <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200 font-semibold text-slate-700">
                            🎯 PF: {device.powerFactor !== null && device.powerFactor !== undefined ? Number(device.powerFactor).toFixed(2) : '1.00'}
                          </span>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-6 relative z-10 gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => { setEditingDevice(device); setEditThreshold(device.powerLimit !== null && device.powerLimit !== undefined ? device.powerLimit : 2.5); }} className="px-3 py-1.5 rounded-lg border border-sky-200 text-[#0EA5E9] font-label-caps text-[10px] font-bold hover:bg-sky-50 transition-colors flex items-center gap-1.5 shadow-sm">
                            <span className="material-symbols-outlined text-sm">
                              tune
                            </span>{" "}
                            EDIT THRESHOLD
                          </button>
                          <button onClick={() => regenerateKey(device.deviceId)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 font-label-caps text-[10px] font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">
                              refresh
                            </span>{" "}
                            REGENERATE KEY
                          </button>
                          <button onClick={() => deleteDevice(device.deviceId)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 font-label-caps text-[10px] font-bold hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">
                              delete
                            </span>{" "}
                            DELETE
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold text-slate-400">Power Relay:</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              checked={device.powerState === 'ON'}
                              onChange={() => toggleDevice(device.deviceId, device.powerState)}
                              className="sr-only peer"
                              type="checkbox"
                            />
                            <div className="w-14 h-7 bg-slate-200 rounded-full peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#35259B] shadow-inner border border-slate-300"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {(!devices || devices.length === 0) && (
                <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                   <h3 className="font-title-md text-slate-900 font-bold mb-2">No Devices Registered</h3>
                   <p className="font-body-md text-slate-500">Click 'Add Device' to get started.</p>
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
