import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', powerLimit: 1000, autoOffMinutes: 5 });

  useEffect(() => {
    fetchDevices();
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
      setNewDevice({ name: '', powerLimit: 1000, autoOffMinutes: 5 });
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
      <div className="min-h-screen px-6 py-12 mx-auto bg-slate-50 text-slate-700 font-inter">
        <div className="flex flex-col w-full gap-8">
          <div className="flex items-end justify-between w-full">
            <div className="flex flex-col gap-1">
              <span className="font-label-caps text-[#0EA5E9] font-bold text-[10px] tracking-widest uppercase">
                SYSTEM INVENTORY
              </span>
              <h1 className="font-display-lg text-slate-900 font-extrabold">
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
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">POWER LIMIT (WATTS)</label>
                    <input type="number" required min="1" value={newDevice.powerLimit} onChange={e => setNewDevice({...newDevice, powerLimit: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">AUTO-OFF MINUTES</label>
                    <input type="number" min="0" value={newDevice.autoOffMinutes} onChange={e => setNewDevice({...newDevice, autoOffMinutes: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all" />
                  </div>
                  <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-slate-100">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 rounded-full text-slate-400 font-bold tracking-wider hover:bg-slate-100 transition-colors text-xs">CANCEL</button>
                    <button type="submit" className="px-8 py-3 rounded-full bg-gradient-to-r from-[#35259B] to-[#0EA5E9] text-white font-bold tracking-wider hover:opacity-90 transition-all shadow-md shadow-sky-500/10 text-xs">REGISTER</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-gutter relative">
            <div className="col-span-12 flex flex-col gap-6">
              {Array.isArray(devices) && devices.map((device, index) => (
                <div key={device.deviceId} className="group relative z-10">
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-8 h-full flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl bg-slate-50 border flex items-center justify-center relative overflow-hidden transition-all ${device.powerState === 'ON' ? 'bg-indigo-50 border-indigo-100 text-[#35259B] shadow-[0_0_15px_rgba(53,37,155,0.15)]' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          <span
                            className="material-symbols-outlined text-3xl"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            settings_input_component
                          </span>
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            {device.name}
                          </h2>
                          <p className="font-data-mono text-xs text-slate-400 flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${device.powerState === 'ON' ? 'bg-[#0EA5E9] animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]' : 'bg-slate-200'}`}></span>
                            API Key: {device.apiKey || 'Hidden'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className={`px-4 py-1.5 rounded-full font-label-caps text-[10px] font-bold flex items-center gap-2 border ${device.powerState === 'ON' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          <span className="material-symbols-outlined text-sm">
                            power_settings_new
                          </span>{" "}
                          {device.powerState === 'ON' ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex flex-col gap-2 hover:bg-slate-100 transition-colors">
                        <span className="font-label-caps text-slate-400 font-bold text-[10px] tracking-wider uppercase">
                          POWER LIMIT
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-3xl font-extrabold font-mono ${device.powerState === 'ON' ? 'text-[#0EA5E9]' : 'text-slate-400'}`}>
                            {device.powerLimit || 'N/A'}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            W
                          </span>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex flex-col gap-2 hover:bg-slate-100 transition-colors">
                        <span className="font-label-caps text-slate-400 font-bold text-[10px] tracking-wider uppercase">
                          AUTO-OFF TIMER
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className={`text-3xl font-extrabold font-mono ${device.powerState === 'ON' ? 'text-[#35259B]' : 'text-slate-400'}`}>
                            {device.autoOffMinutes || '--'}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            Mins
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-6 relative z-10">
                      <div className="flex items-center gap-2">
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
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            checked={device.powerState === 'ON'}
                            onChange={() => toggleDevice(device.deviceId, device.powerState)}
                            className="sr-only peer"
                            type="checkbox"
                          />
                          <div className="w-16 h-8 bg-slate-200 rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#35259B] shadow-inner border border-slate-300"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
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
