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
        
        setInsights({
          totalPower: dashboardRes.data?.currentPowerKW || 0,
          voltage: 238, // Simulated since it's not in dashboard endpoint
          frequency: 60.0 // Simulated
        });
        
        const fetchedDevices = dashboardRes.data?.devices || [];
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
             newHistory[result.deviceId] = result.readings
                 .slice(0, 15)
                 .reverse()
                 .map(r => ({
                     timestamp: new Date(r.timestamp).getTime(),
                     power: Number(r.power) || 0
                 }));
        });
        
        setDeviceHistory(newHistory);

      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 15000);
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
      <div className="relative bg-slate-50 min-h-screen p-6">
        <div className="flex flex-col w-full space-y-6">
          {/*  Header Section  */}
          <header className="flex justify-between items-end mb-4">
            <div>
              <h1 className="font-display-lg text-display-lg text-slate-900 font-extrabold">
                Live Telemetry
              </h1>
              <p className="font-body-md text-body-md text-slate-400 font-bold mt-1 uppercase tracking-widest text-xs">
                System Status: Nominal
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-indigo-50 rounded-full flex items-center gap-2 border border-indigo-100/50">
                <span className="w-2 h-2 rounded-full bg-[#35259B] animate-pulse shadow-[0_0_8px_rgba(53,37,155,0.8)]"></span>
                <span className="font-label-caps text-xs text-[#35259B] font-bold">
                  LIVE STREAM
                </span>
              </div>
              <button className="px-6 py-2 bg-gradient-to-r from-[#35259B] to-[#0EA5E9] hover:from-[#2143B8] hover:to-[#0EA5E9] text-white rounded-lg font-bold text-sm shadow-md shadow-sky-500/10 transition-all active:scale-95">
                Export Data
              </button>
            </div>
          </header>
          {/*  Instant Metrics  */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/*  Metric 1  */}
            <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#0EA5E9]/5 rounded-full blur-3xl group-hover:bg-[#0EA5E9]/10 transition-all duration-500"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px]">
                    bolt
                  </span>
                  <span className="font-label-caps text-[10px] uppercase font-bold tracking-wider">
                    TOTAL LOAD
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold border border-red-200/50">
                  PEAK
                </span>
              </div>
              <div className="relative z-10 flex items-baseline gap-2">
                <span
                  className="font-display-lg text-display-lg text-slate-900 font-extrabold"
                  id="total-load"
                >
                  {insights?.totalPower || 0.0}
                </span>
                <span className="text-xl font-semibold text-slate-400">
                  kW
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 relative z-10 font-medium">
                <span className="material-symbols-outlined text-red-500 text-[16px] font-bold">
                  arrow_upward
                </span>
                <span>+12% from average</span>
              </div>
            </div>
            {/*  Metric 2  */}
            <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#35259B]/5 rounded-full blur-3xl group-hover:bg-[#35259B]/10 transition-all duration-500"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px]">
                    electric_meter
                  </span>
                  <span className="font-label-caps text-[10px] uppercase font-bold tracking-wider">
                    VOLTAGE
                  </span>
                </div>
              </div>
              <div className="relative z-10 flex items-baseline gap-2">
                <span
                  className="font-display-lg text-display-lg text-slate-900 font-extrabold"
                  id="voltage"
                >
                  {insights?.voltage || 238}
                </span>
                <span className="text-xl font-semibold text-[#35259B]">
                  V
                </span>
              </div>
              <div className="mt-5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-[#35259B] w-[85%] rounded-full shadow-[0_0_10px_rgba(53,37,155,0.4)]"></div>
              </div>
            </div>
            {/*  Metric 3  */}
            <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#0EA5E9]/5 rounded-full blur-3xl group-hover:bg-[#0EA5E9]/10 transition-all duration-500"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-[20px]">
                    waves
                  </span>
                  <span className="font-label-caps text-[10px] uppercase font-bold tracking-wider">
                    GRID FREQUENCY
                  </span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9] shadow-[0_0_8px_rgba(14,165,233,0.8)]"></span>
              </div>
              <div className="relative z-10 flex items-baseline gap-2">
                <span
                  className="font-display-lg text-display-lg text-slate-900 font-extrabold"
                  id="frequency"
                >
                  {insights?.frequency || '60.0'}
                </span>
                <span className="text-xl font-semibold text-[#0EA5E9]">
                  Hz
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600 relative z-10 font-bold">
                <span className="material-symbols-outlined text-green-600 text-[16px]">
                  check_circle
                </span>
                <span>Stable</span>
              </div>
            </div>
          </div>
          {/*  Individual Device Streams  */}
          <div>
            <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
              <h2 className="font-headline-lg text-headline-lg text-slate-900 font-bold">
                Device Telemetry Streams
              </h2>
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button className="px-3 py-1 rounded-lg bg-white text-slate-800 text-xs font-bold shadow-sm">
                  1H
                </button>
                <button className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-900 text-xs font-bold transition-all">
                  6H
                </button>
                <button className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-900 text-xs font-bold transition-all">
                  24H
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {devices.map((device, index) => {
                const colorClass = index % 4 === 0 ? 'electric-blue' : index % 4 === 1 ? 'vibrant-violet' : index % 4 === 2 ? 'primary' : 'error';
                const icon = index % 4 === 0 ? 'ac_unit' : index % 4 === 1 ? 'ev_charger' : index % 4 === 2 ? 'water_ph' : 'dns';
                
                return (
                  <div key={device.deviceId} className={`bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col group`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/20 via-transparent to-transparent opacity-50 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm transition-all ${device.powerState === 'ON' ? 'bg-indigo-50 border-indigo-100 text-[#35259B] shadow-[0_0_15px_rgba(53,37,155,0.15)]' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          <span className="material-symbols-outlined text-[24px]">
                            {icon}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 leading-tight">
                            {device.name}
                          </h3>
                          <div className="flex flex-col mt-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className={`font-mono font-extrabold text-xl ${device.powerState === 'ON' ? 'text-[#35259B]' : 'text-slate-400'}`}>
                                {(device.energyKWh || 0).toFixed(2)}
                              </span>
                              <span className="text-xs font-semibold text-slate-400">kWh today</span>
                            </div>
                            {device.powerLimit && (
                              <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                LIMIT: {device.powerLimit} kWh
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    
                    <div className="h-48 w-full relative z-10 flex flex-1 items-end mt-4">
                      {device.powerState === 'ON' ? (
                        <Graph 
                          data={deviceHistory[device.deviceId] || []} 
                          title="" 
                          colorHex={index % 4 === 0 ? '#0EA5E9' : index % 4 === 1 ? '#35259B' : index % 4 === 2 ? '#4CD6FF' : '#FFB4AB'} 
                        />
                      ) : (
                        <svg
                          className="w-full h-full"
                          preserveAspectRatio="none"
                          viewBox="0 0 100 40"
                        >
                          <path
                            d="M0,39 L100,39"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          ></path>
                        </svg>
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
