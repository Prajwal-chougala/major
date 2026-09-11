import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";
import Graph from "../components/Graph";

// Full gauge circumference for r=54: 2π×54 ≈ 339.29
// Visible arc is 3/4 of that: 251
const GAUGE_ARC = 251;
const GAUGE_TOTAL = 339.29;
// Assume max capacity of 20 kW for a home grid
const MAX_CAPACITY_KW = 20;

function Dashboard() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [cost, setCost] = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceCounts, setDeviceCounts] = useState({ active: 0, offline: 0, total: 0, hardware: 0 });
  const [togglingIds, setTogglingIds] = useState({});
  const togglingRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [editingThresholdDevice, setEditingThresholdDevice] = useState(null);
  const [thresholdInput, setThresholdInput] = useState('');

  useEffect(() => {
    // Initial load: fetch real chart history first
    const initChart = async () => {
      try {
        const chartRes = await API.get('/power/chart');
        if (chartRes.data?.data?.length > 0) {
          const chartData = chartRes.data.data.map(item => ({
            timestamp: new Date(item.timestamp).getTime(),
            power: item.powerW !== undefined ? Number(item.powerW) : Number(item.power || 0) * 1000,
            energy: Number(item.energyKWh || 0),
          }));
          setChartHistory(chartData.slice(-30));
        }
      } catch (e) {
        // ignore, will build chart from live polling
      }
    };

    initChart();
    fetchAll();
    const interval = setInterval(fetchAll, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    try {
      const dashboardRes = await API.get('/dashboard').catch(() => ({
        data: { totalEnergyKWh: 0, currentPowerKW: 0, estimatedCost: 0, peakPowerKW: 0, devices: [], activeDevices: 0, totalDevices: 0, offlineDevices: 0 }
      }));

      const data = dashboardRes.data;

      setInsights({
        totalPower: (data?.currentPowerKW || 0) * 1000,
        highestPower: (data?.peakPowerKW || 0) * 1000,
        totalEnergyKWh: data?.totalEnergyKWh || 0,
        ratePerKWh: data?.ratePerKWh || 8,
      });

      setCost({ estimatedCost: data?.estimatedCost || 0 });

      setDeviceCounts({
        active: data?.activeDevices || 0,
        offline: data?.offlineDevices || 0,
        total: data?.totalDevices || 0,
        hardware: data?.hardwareOnline || 0,
      });

      const fetchedDevices = data?.devices || [];
      setDevices(prevDevices => {
        return fetchedDevices.map(d => {
          if (togglingRef.current[d.deviceId]) {
            const existing = prevDevices.find(p => p.deviceId === d.deviceId);
            return existing ? { ...d, powerState: existing.powerState } : d;
          }
          return d;
        });
      });

      // Append live point to chart (power in W, continuous energy in kWh)
      const now = Date.now();
      const latestPowerW = (data?.currentPowerKW || 0) * 1000;
      const latestEnergyKWh = data?.totalEnergyKWh || 0;
      setChartHistory(prev => {
        const point = { timestamp: now, power: latestPowerW, energy: latestEnergyKWh };
        if (prev.length === 0) return [point];
        const newHistory = [...prev, point];
        if (newHistory.length > 60) newHistory.shift();
        return newHistory;
      });

      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const handleSaveThreshold = async (e) => {
    e.preventDefault();
    if (!editingThresholdDevice) return;
    try {
      const val = Number(thresholdInput);
      await API.put(`/devices/${editingThresholdDevice.deviceId}`, { powerLimit: val });
      setDevices(prev => prev.map(d => d.deviceId === editingThresholdDevice.deviceId ? { ...d, powerLimit: val } : d));
      setEditingThresholdDevice(null);
    } catch (err) {
      console.error("Failed to update threshold", err);
      alert("Failed to update energy threshold.");
    }
  };

  const toggleDevice = async (deviceId, currentStatus) => {
    if (togglingRef.current[deviceId]) return;
    togglingRef.current[deviceId] = true;
    setTogglingIds(prev => ({ ...prev, [deviceId]: true }));

    const targetState = currentStatus === 'ON' ? 'OFF' : 'ON';

    setDevices(prev => prev.map(d =>
      d.deviceId === deviceId
        ? { ...d, powerState: targetState }
        : d
    ));

    try {
      let res;
      if (currentStatus === 'ON') {
        res = await API.post(`/devices/${deviceId}/turn-off`);
      } else {
        res = await API.post(`/devices/${deviceId}/turn-on`);
      }

      if (res?.data?.device) {
        setDevices(prev => prev.map(d => d.deviceId === deviceId ? { ...d, powerState: res.data.device.powerState } : d));
      }
    } catch (e) {
      console.error("Failed to toggle device", e);
      setDevices(prev => prev.map(d =>
        d.deviceId === deviceId ? { ...d, powerState: currentStatus } : d
      ));
    } finally {
      delete togglingRef.current[deviceId];
      setTogglingIds(prev => {
        const next = { ...prev };
        delete next[deviceId];
        return next;
      });
    }
  };

  // Compute dynamic gauge arc fill
  const currentKW = insights?.totalPower ? insights.totalPower / 1000 : 0;
  const gaugeFill = Math.min((currentKW / MAX_CAPACITY_KW) * GAUGE_ARC, GAUGE_ARC);
  const gaugeEmpty = GAUGE_TOTAL - gaugeFill;
  const peakKW = insights?.highestPower ? insights.highestPower / 1000 : 0;

  const vsAvgPct = peakKW > 0 && currentKW > 0
    ? Math.round(((currentKW - peakKW * 0.75) / (peakKW * 0.75)) * 100)
    : null;

  const deviceIcons = ['mode_fan', 'ev_station', 'kitchen', 'ac_unit', 'water_heater', 'computer'];

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
      <div className="bg-slate-50 font-body-md text-slate-800 min-h-screen p-6">
        <div className="flex flex-col w-full gap-section-gap">

          {/* ── Device Summary Bar ── */}
          <div className="grid grid-cols-3 gap-4">
            {/* Online Devices */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined text-[20px]">wifi</span>
              </div>
              <div>
                <div className="font-label-caps text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online Devices</div>
                <div className="text-2xl text-slate-900 font-bold">{deviceCounts.active}</div>
              </div>
            </div>
            {/* Offline Devices */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                <span className="material-symbols-outlined text-[20px]">wifi_off</span>
              </div>
              <div>
                <div className="font-label-caps text-[10px] text-slate-400 font-bold uppercase tracking-wider">Offline Devices</div>
                <div className="text-2xl text-slate-900 font-bold">{deviceCounts.offline}</div>
              </div>
            </div>
            {/* Total Devices */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#35259B]">
                <span className="material-symbols-outlined text-[20px]">devices</span>
              </div>
              <div>
                <div className="font-label-caps text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Devices</div>
                <div className="text-2xl text-slate-900 font-bold">{deviceCounts.total}</div>
              </div>
            </div>
          </div>

          {/* ── Top Row: Main Stats & Vis ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Left Col: Primary Energy Load */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 to-sky-50/20 opacity-50"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="font-title-md text-title-md text-slate-900 font-bold">
                        Current Load
                      </h2>
                      <p className="font-data-mono text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">
                        {deviceCounts.total > 0 ? `${deviceCounts.total} device${deviceCounts.total !== 1 ? 's' : ''} registered` : 'No devices'}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-electric-blue animate-pulse">
                      sensors
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center relative">
                    {/* Dynamic SVG Gauge */}
                    <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#35259B" />
                          <stop offset="100%" stopColor="#0EA5E9" />
                        </linearGradient>
                      </defs>
                      {/* Track */}
                      <circle
                        cx="60" cy="60" fill="none" r="54"
                        stroke="#e2e8f0"
                        strokeDasharray={`${GAUGE_ARC} ${GAUGE_TOTAL}`}
                        strokeWidth="8.5"
                      />
                      {/* Fill - dynamic */}
                      <circle
                        cx="60" cy="60" fill="none" r="54"
                        stroke="url(#gaugeGrad)"
                        strokeDasharray={`${gaugeFill} ${gaugeEmpty}`}
                        strokeLinecap="round"
                        strokeWidth="8.5"
                        className="drop-shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="font-display-lg text-display-lg bg-clip-text text-transparent bg-brand-gradient font-black">
                        {currentKW.toFixed(1)}
                        <span className="text-2xl ml-1 font-title-md text-slate-500 font-bold">kW</span>
                      </div>
                      {vsAvgPct !== null ? (
                        <div className={`font-label-caps ${vsAvgPct >= 0 ? 'text-red-600 bg-red-50 border-red-200/50' : 'text-green-600 bg-green-50 border-green-200/50'} border px-2.5 py-1 rounded-full text-[10px] mt-3 uppercase tracking-[0.1em] flex items-center gap-1 font-bold`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {vsAvgPct >= 0 ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                          {Math.abs(vsAvgPct)}% vs avg
                        </div>
                      ) : (
                        <div className="font-label-caps text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] mt-3 uppercase tracking-[0.1em] font-bold">
                          {insights?.totalEnergyKWh?.toFixed(2) || '0.00'} kWh today
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:border-[#35259B]/20 transition-all">
                  <div className="font-label-caps text-slate-400 font-bold text-[10px] uppercase mb-2">Daily Peak</div>
                  <div className="font-title-md text-title-md text-slate-900 font-bold flex items-baseline gap-1">
                    {peakKW.toFixed(1)}
                    <span className="font-data-mono text-xs text-slate-500 font-bold">kW</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    {insights?.ratePerKWh ? `₹${insights.ratePerKWh}/kWh` : ''}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:border-[#0EA5E9]/20 transition-all flex flex-col justify-between">
                  <div>
                    <div className="font-label-caps text-slate-400 font-bold text-[10px] uppercase mb-1">Today's Cost</div>
                    <div className="font-title-md text-title-md text-slate-900 font-bold flex items-baseline gap-1">
                      ₹{Number(cost?.estimatedCost || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="font-label-caps text-slate-400 font-bold text-[10px] uppercase mb-1">Est. Monthly</div>
                    <div className="font-title-md text-title-md text-[#0EA5E9] font-bold flex items-baseline gap-1 text-sm">
                      ₹{((cost?.estimatedCost || 0) * 30).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Visual Centerpiece & Chart */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <img
                  alt="Smart Home Holographic Visualization"
                  className="w-full h-full object-cover opacity-90 rounded-2xl"
                  src="/dashboard-hologram.jpg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <div className="font-label-caps text-label-caps text-sky-400 uppercase tracking-widest mb-1 flex items-center gap-2 font-bold">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                      Live Node Sync
                    </div>
                    <h3 className="font-title-md text-title-md text-white font-bold">
                      Spatial Energy Mapping
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate('/monitoring')}
                    className="px-4 py-2 bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-full backdrop-blur-md border border-white/40 transition-all font-label-caps text-label-caps uppercase flex items-center gap-2 font-bold"
                  >
                    Live Monitor
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </button>
                </div>
              </div>

              {/* Interactive Area Chart - real data */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex-1">
                <Graph
                  data={chartHistory}
                  title="Consumption Profile (Live)"
                  colorHex="#0EA5E9"
                  defaultMetric="power"
                />
              </div>
            </div>
          </section>

          {/* ── Bottom Row: Active Devices ── */}
          <section className="flex flex-col gap-6">
            <div className="flex justify-between items-end border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-slate-900 font-bold">
                  Active Nodes
                </h2>
                <p className="font-body-md text-body-md text-slate-500">
                  Real-time appliance monitoring and control.
                </p>
              </div>
              <Link to="/devices" className="text-[#0EA5E9] hover:underline font-label-caps text-label-caps uppercase flex items-center gap-1 transition-all">
                View All{" "}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {devices.map((device, index) => {
                const energyThresholdKWh = device.powerLimit ? Number(device.powerLimit) : 0;
                const currentWatts = device.currentPowerW || 0;
                const energyKWh = device.energyKWh || 0;
                const icon = deviceIcons[index % deviceIcons.length];
                const usagePct = energyThresholdKWh > 0 ? Math.min((energyKWh / energyThresholdKWh) * 100, 100) : 0;

                return (
                  <div key={device.deviceId} className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:bg-slate-50 transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${device.powerState === 'ON' ? 'bg-indigo-50 border-indigo-100 text-[#35259B] shadow-[0_0_15px_rgba(53,37,155,0.15)]' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                        <span className="material-symbols-outlined">{icon}</span>
                      </div>
                      {/* Toggle */}
                      <label className={`relative inline-flex items-center ${togglingIds[device.deviceId] ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          checked={device.powerState === 'ON'}
                          disabled={!!togglingIds[device.deviceId]}
                          onChange={() => toggleDevice(device.deviceId, device.powerState)}
                          className="sr-only peer"
                          type="checkbox"
                        />
                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#35259B] shadow-inner border border-slate-300"></div>
                      </label>
                    </div>

                    <h4 className="font-title-md text-title-md text-slate-900 font-bold truncate">{device.name}</h4>

                    {/* Real-time watts */}
                    <div className="flex items-baseline gap-1 mt-1 mb-3">
                      <span className={`font-data-mono text-lg font-bold ${device.powerState === 'ON' ? 'text-[#0EA5E9]' : 'text-slate-300'}`}>
                        {device.powerState === 'ON' ? currentWatts.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">W</span>
                    </div>

                    {/* Energy + status row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-label-caps text-[9px] text-slate-400 font-bold uppercase">Today's Energy</div>
                        <div className="font-data-mono text-xs text-[#35259B] font-bold">{energyKWh.toFixed(4)} kWh</div>
                      </div>
                      {device.powerState === 'ON' ? (
                        <span className="font-label-caps text-[9px] px-2 py-0.5 rounded border border-green-200 text-green-600 bg-green-50 uppercase font-bold">
                          Active
                        </span>
                      ) : (
                        <span className="font-label-caps text-[9px] px-2 py-0.5 rounded border border-slate-200 text-slate-400 bg-slate-50 uppercase font-bold">
                          Standby
                        </span>
                      )}
                    </div>

                    {/* Energy threshold bar */}
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          THRESHOLD
                          <button
                            type="button"
                            onClick={() => {
                              setEditingThresholdDevice(device);
                              setThresholdInput(device.powerLimit || 2.5);
                            }}
                            className="text-slate-400 hover:text-[#0EA5E9] transition-colors p-0.5 rounded hover:bg-slate-100"
                            title="Edit Energy Threshold"
                          >
                            <span className="material-symbols-outlined text-[13px]">tune</span>
                          </button>
                        </span>
                        {energyThresholdKWh > 0 ? (
                          <span className={usagePct >= 100 ? "text-red-500 font-bold" : ""}>
                            {energyKWh.toFixed(4)} / {energyThresholdKWh} kWh ({usagePct.toFixed(0)}%)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingThresholdDevice(device);
                              setThresholdInput(2.5);
                            }}
                            className="text-[#0EA5E9] hover:underline cursor-pointer"
                          >
                            Set Limit
                          </button>
                        )}
                      </div>
                      {energyThresholdKWh > 0 && (
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              usagePct >= 100 ? 'bg-red-500' : usagePct > 80 ? 'bg-amber-500' : 'bg-[#35259B]'
                            }`}
                            style={{ width: `${usagePct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add Device Card */}
              <Link to="/devices" className="bg-white border border-slate-200 border-dashed rounded-2xl p-5 hover:bg-slate-50 transition-colors group flex flex-col justify-center items-center cursor-pointer shadow-sm">
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-[#0EA5E9] group-hover:border-[#0EA5E9]/50 transition-all mb-3">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <h4 className="font-label-caps text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-[#0EA5E9] transition-colors">
                  Add Device Node
                </h4>
              </Link>
            </div>
          </section>

          {editingThresholdDevice && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set Energy Threshold</h2>
                    <p className="text-xs text-slate-400 mt-1">{editingThresholdDevice.name}</p>
                  </div>
                  <button onClick={() => setEditingThresholdDevice(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <form onSubmit={handleSaveThreshold} className="flex flex-col gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">DAILY ENERGY LIMIT (kWh)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={thresholdInput}
                      onChange={e => setThresholdInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] outline-none transition-all font-mono"
                      placeholder="e.g. 0.02 or 1.5"
                    />
                    <p className="text-[11px] text-slate-400 mt-2">
                      When this appliance reaches this threshold, the server automatically commands the relay to turn OFF and sends an SMS to your registered phone.
                    </p>
                  </div>

                  <div className="flex justify-end gap-4 mt-4 pt-6 border-t border-slate-100">
                    <button type="button" onClick={() => setEditingThresholdDevice(null)} className="px-6 py-3 rounded-full text-slate-400 font-bold tracking-wider hover:bg-slate-100 transition-colors text-xs">
                      CANCEL
                    </button>
                    <button type="submit" className="px-8 py-3 rounded-full bg-gradient-to-r from-[#35259B] to-[#0EA5E9] text-white font-bold tracking-wider hover:opacity-90 transition-all shadow-md shadow-sky-500/10 text-xs">
                      SAVE THRESHOLD
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
