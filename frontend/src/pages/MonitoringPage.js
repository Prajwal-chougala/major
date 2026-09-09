import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import Graph from "../components/Graph";

function MonitoringPage() {
  const [insights, setInsights] = useState(null);
  const [devices, setDevices] = useState([]);
  const [deviceHistory, setDeviceHistory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardRes = await API.get('/dashboard');
        const data = dashboardRes.data || {};
        
        setInsights({
          totalEnergyKWh: data.totalEnergyKWh || 0,
          totalPower: data.currentPowerKW || 0,
          currentPowerW: data.currentPowerW !== undefined ? data.currentPowerW : ((data.currentPowerKW || 0) * 1000),
          voltage: data.latestVoltage || 0,
          frequency: data.latestFrequency || 0,
          current: data.latestCurrent || 0,
          powerFactor: data.latestPowerFactor || 0,
        });
        
        const fetchedDevices = data.devices || [];
        setDevices(fetchedDevices);
        setLoading(false);

        // Fetch real-time history for each device
        const historyPromises = fetchedDevices.map(device => 
            API.get(`/readings/${device.deviceId}`)
              .then(res => ({
                deviceId: device.deviceId,
                readings: res.data.readings
              }))
              .catch(() => ({ deviceId: device.deviceId, readings: [] }))
        );
        
        const historyResults = await Promise.all(historyPromises);
        
        const newHistory = {};
        historyResults.forEach(result => {
             newHistory[result.deviceId] = (result.readings || [])
                 .slice(0, 30)
                 .reverse()
                 .map(r => ({
                     timestamp: new Date(r.timestamp).getTime(),
                     power: Number(r.power) || 0,
                     energy: Number(r.energy !== undefined ? r.energy : (r.energyKWh || 0)),
                     voltage: Number(r.voltage) || 0,
                     current: Number(r.current) || 0,
                     frequency: Number(r.frequency) || 0,
                     powerFactor: Number(r.powerFactor) || 0,
                 }));
        });
        
        setDeviceHistory(newHistory);

      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="relative bg-slate-50 min-h-screen p-6 sm:p-8 font-inter">
        <div className="flex flex-col w-full space-y-8 max-w-7xl mx-auto">
          {/* Header Section */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <span className="font-label-caps text-[#0EA5E9] font-bold text-[10px] tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]"></span>
                PZEM-004T SENSOR TELEMETRY
              </span>
              <h1 className="font-display-lg text-slate-900 font-extrabold text-3xl sm:text-4xl mt-1">
                Real-Time Telemetry
              </h1>
              <p className="font-body-md text-slate-400 font-semibold mt-1 tracking-wider text-xs">
                Live Sensor Ingestion Active • Auto-Refresh (3s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-indigo-50 rounded-full flex items-center gap-2 border border-indigo-100 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#35259B] animate-pulse shadow-[0_0_10px_rgba(53,37,155,0.8)]"></span>
                <span className="font-label-caps text-xs text-[#35259B] font-bold tracking-wider">
                  LIVE STREAMING
                </span>
              </div>
            </div>
          </header>

          {/* 4 Instant Real-Time Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Metric 1: Today's Energy Consumed (Real-time from Sensor) */}
            <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#35259B]/10 rounded-full blur-2xl group-hover:bg-[#35259B]/15 transition-all duration-500"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px] text-[#35259B]">
                    electric_meter
                  </span>
                  <span className="font-label-caps text-[10px] uppercase font-bold tracking-wider text-slate-600">
                    TODAY'S ENERGY
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-indigo-50 text-[#35259B] rounded-full text-[10px] font-bold border border-indigo-100">
                  SENSOR
                </span>
              </div>
              <div className="relative z-10 flex items-baseline gap-2">
                <span
                  className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight"
                  id="today-energy"
                >
                  {(insights?.totalEnergyKWh || 0).toFixed(4)}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  kWh
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 relative z-10 font-medium">
                <span className="material-symbols-outlined text-[#35259B] text-[16px] font-bold">
                  bolt
                </span>
                <span>Cumulative energy today</span>
              </div>
            </div>

            {/* Metric 2: Line Voltage (Real-time from PZEM) */}
            <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#0EA5E9]/10 rounded-full blur-2xl group-hover:bg-[#0EA5E9]/15 transition-all duration-500"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px] text-[#0EA5E9]">
                    speed
                  </span>
                  <span className="font-label-caps text-[10px] uppercase font-bold tracking-wider text-slate-600">
                    LINE VOLTAGE
                  </span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              </div>
              <div className="relative z-10 flex items-baseline gap-2">
                <span
                  className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight"
                  id="voltage"
                >
                  {insights?.voltage ? Number(insights.voltage).toFixed(1) : '230.0'}
                </span>
                <span className="text-sm font-bold text-[#0EA5E9]">
                  V
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 relative z-10 font-medium">
                <span className="material-symbols-outlined text-emerald-500 text-[16px]">
                  check_circle
                </span>
                <span>RMS AC mains voltage</span>
              </div>
            </div>

            {/* Metric 3: Grid Frequency (Real-time from PZEM) */}
            <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all duration-500"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px] text-emerald-600">
                    waves
                  </span>
                  <span className="font-label-caps text-[10px] uppercase font-bold tracking-wider text-slate-600">
                    GRID FREQUENCY
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
                  STABLE
                </span>
              </div>
              <div className="relative z-10 flex items-baseline gap-2">
                <span
                  className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight"
                  id="frequency"
                >
                  {insights?.frequency ? Number(insights.frequency).toFixed(2) : '50.00'}
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  Hz
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 relative z-10 font-medium">
                <span className="material-symbols-outlined text-emerald-500 text-[16px]">
                  sync
                </span>
                <span>Standard grid synchronized</span>
              </div>
            </div>

            {/* Metric 4: Active Power Load */}
            <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all duration-500"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px] text-amber-500">
                    bolt
                  </span>
                  <span className="font-label-caps text-[10px] uppercase font-bold tracking-wider text-slate-600">
                    ACTIVE LOAD
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold border border-amber-200">
                  LIVE
                </span>
              </div>
              <div className="relative z-10 flex items-baseline gap-2">
                <span
                  className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight"
                  id="total-load"
                >
                  {insights?.currentPowerW !== undefined ? Number(insights.currentPowerW).toFixed(1) : ((insights?.totalPower || 0) * 1000).toFixed(1)}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  W
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 relative z-10 font-medium">
                <span className="font-mono font-semibold text-slate-600">
                  ≈ {(insights?.totalPower || 0).toFixed(3)} kW
                </span>
                <span className="text-slate-300">•</span>
                <span>{insights?.current ? Number(insights.current).toFixed(2) + ' A' : '0.00 A'}</span>
              </div>
            </div>
          </div>

          {/* Secondary Telemetry Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl px-6 py-4 shadow-sm text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#35259B]">tune</span>
              <span className="font-bold text-slate-800">Grid Telemetry Diagnostics:</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                Current Draw: <strong className="text-slate-900">{insights?.current ? Number(insights.current).toFixed(2) : '0.00'} A</strong>
              </span>
              <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                Power Factor: <strong className="text-slate-900">{insights?.powerFactor ? Number(insights.powerFactor).toFixed(2) : '1.00'} PF</strong>
              </span>
              <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                Telemetry Period: <strong className="text-slate-900">7s Ingest / 3s Poll</strong>
              </span>
            </div>
          </div>

          {/* Individual Device Streams */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b border-slate-200 pb-4 gap-2">
              <div>
                <h2 className="font-headline-lg text-slate-900 font-extrabold text-2xl">
                  Device Telemetry Streams
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dynamic visual graphs with live switching between Energy (kWh) and Power (W)
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {devices.map((device, index) => {
                const icon = index % 4 === 0 ? 'ac_unit' : index % 4 === 1 ? 'ev_charger' : index % 4 === 2 ? 'water_ph' : 'dns';
                const consumedEnergy = Number(device.energyKWh !== undefined ? device.energyKWh : (device.dailyEnergyKWh || 0));
                const currentPowerW = device.powerState === 'ON' ? Number(device.currentPowerW || 0) : 0;
                
                return (
                  <div key={device.deviceId} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col group">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/20 via-transparent to-transparent opacity-50 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-all ${device.powerState === 'ON' ? 'bg-indigo-50 border-indigo-100 text-[#35259B] shadow-[0_0_15px_rgba(53,37,155,0.15)]' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          <span className="material-symbols-outlined text-[24px]">
                            {icon}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-slate-900 leading-tight">
                              {device.name}
                            </h3>
                            <span className={`w-2 h-2 rounded-full ${device.powerState === 'ON' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="font-mono font-bold text-[#35259B]">
                              {consumedEnergy.toFixed(4)} kWh
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono font-semibold text-slate-500">
                              {currentPowerW.toFixed(1)} W
                            </span>
                            {device.powerLimit && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-[11px] font-bold text-slate-400">
                                  LIMIT: {device.powerLimit} kWh
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${device.powerState === 'ON' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                        {device.powerState === 'ON' ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>

                    {/* Telemetry quick chips */}
                    {device.powerState === 'ON' && (
                      <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] font-mono text-slate-600 relative z-10">
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {device.voltage ? Number(device.voltage).toFixed(1) : '230.0'} V
                        </span>
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {device.current ? Number(device.current).toFixed(2) : '0.00'} A
                        </span>
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {device.frequency ? Number(device.frequency).toFixed(1) : '50.0'} Hz
                        </span>
                        <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          PF {device.powerFactor !== null && device.powerFactor !== undefined ? Number(device.powerFactor).toFixed(2) : '1.00'}
                        </span>
                      </div>
                    )}

                    <div className="min-h-[200px] h-52 w-full relative z-10 flex flex-1 items-end mt-2">
                      {device.powerState === 'ON' ? (
                        <Graph 
                          data={deviceHistory[device.deviceId] || []} 
                          title="" 
                          colorHex={index % 4 === 0 ? '#0EA5E9' : index % 4 === 1 ? '#35259B' : index % 4 === 2 ? '#10B981' : '#F59E0B'} 
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 border border-slate-100 border-dashed rounded-2xl">
                          <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">power_off</span>
                          <span className="text-xs font-semibold">Device is powered OFF</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default MonitoringPage;
