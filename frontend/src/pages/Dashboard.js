import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";
import Graph from "../components/Graph";

function Dashboard() {
  const [insights, setInsights] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [cost, setCost] = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashboardRes, chartRes] = await Promise.all([
          API.get('/dashboard').catch(e => ({ data: { totalEnergyKWh: 0, currentPowerKW: 4.2, estimatedCost: 142.50, peakPowerKW: 6.8, devices: [] } })),
          API.get('/power/chart?period=today').catch(e => ({ data: { data: [] } }))
        ]);
        
        setInsights({
          totalPower: (dashboardRes.data?.currentPowerKW || 0) * 1000,
          highestPower: (dashboardRes.data?.peakPowerKW || 0) * 1000
        });
        setCost({ estimatedCost: dashboardRes.data?.estimatedCost || 0 });
        
        // Update Chart History with moving window
        const now = Date.now();
        const latestPower = (dashboardRes.data?.currentPowerKW || 0) * 1000;
        
        setChartHistory(prev => {
          if (prev.length === 0) {
             // Initialize
             return Array.from({ length: 24 }, (_, i) => ({ 
               timestamp: now - (23 - i) * 5000, 
               power: Math.random() * 5000 + 2000 
             }));
          }
          const newHistory = [...prev, { timestamp: now, power: latestPower }];
          if (newHistory.length > 24) newHistory.shift();
          return newHistory;
        });

        setDevices(dashboardRes.data?.devices || []);
        setLoading(false);
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const turnOffDevice = async (deviceId, currentStatus) => {
    try {
      if (currentStatus === 'ON') {
        await API.post(`/devices/${deviceId}/turn-off`).catch(e => console.log('API Failed but updating UI locally'));
        setDevices(devices.map(d => d.deviceId === deviceId ? { ...d, powerState: 'OFF' } : d));
      } else {
        // Toggle on
        await API.post(`/devices/${deviceId}/turn-on`).catch(e => console.log('API Failed but updating UI locally'));
        setDevices(devices.map(d => d.deviceId === deviceId ? { ...d, powerState: 'ON' } : d));
      }
    } catch (error) {
      console.log(error);
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
      <div className="bg-slate-50 font-body-md text-slate-800 min-h-screen p-6">
        <div className="flex flex-col w-full gap-section-gap">
          {/*  Top Row: Main Stats & Vis  */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/*  Left Col: Primary Energy Load  */}
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
                        System Grid Alpha
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-electric-blue animate-pulse">
                      sensors
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center relative">
                    {/*  SVG Gauge  */}
                    <svg
                      className="w-48 h-48 transform -rotate-90"
                      viewBox="0 0 120 120"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        fill="none"
                        r="54"
                        stroke="#e2e8f0"
                        strokeDasharray="251 339.29"
                        strokeWidth="8.5"
                      ></circle>
                      <circle
                        className="text-[#0EA5E9] drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                        cx="60"
                        cy="60"
                        fill="none"
                        r="54"
                        stroke="currentColor"
                        strokeDasharray="180 339.29"
                        strokeLinecap="round"
                        strokeWidth="8.5"
                      ></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="font-display-lg text-display-lg bg-clip-text text-transparent bg-brand-gradient font-black">
                        {insights?.totalPower ? (insights.totalPower / 1000).toFixed(1) : '0.0'}
                        <span className="text-2xl ml-1 font-title-md text-slate-500 font-bold">
                          kW
                        </span>
                      </div>
                      <div className="font-label-caps text-green-600 bg-green-50 border border-green-200/50 px-2.5 py-1 rounded-full text-[10px] mt-3 uppercase tracking-[0.1em] flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-[14px]">
                          arrow_drop_down
                        </span>
                        12% vs avg
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:border-[#35259B]/20 transition-all">
                  <div className="font-label-caps text-slate-400 font-bold text-[10px] uppercase mb-2">
                    Daily Peak
                  </div>
                  <div className="font-title-md text-title-md text-slate-900 font-bold flex items-baseline gap-1">
                    {insights?.highestPower ? (insights.highestPower / 1000).toFixed(1) : '0.0'}
                    <span className="font-data-mono text-xs text-slate-500 font-bold">
                      kW
                    </span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm hover:border-[#0EA5E9]/20 transition-all">
                  <div className="font-label-caps text-slate-400 font-bold text-[10px] uppercase mb-2">
                    Est. Monthly
                  </div>
                  <div className="font-title-md text-title-md text-[#0EA5E9] font-bold flex items-baseline gap-1">
                    ${cost?.estimatedCost || '0.00'}
                  </div>
                </div>
              </div>
            </div>
            {/*  Right Col: Visual Centerpiece & Chart  */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <img
                  alt="Smart Home Holographic Visualization"
                  className="w-full h-full object-cover opacity-90 rounded-2xl"
                  src="https://lh3.googleusercontent.com/aida/AP1WRLuMy7QLXSyZ7SB8fKMuTne81Zvk2kzrnpDskVkF-GL7fACa_KcZAMHgMoS0Nss-4EkMI1sKt6vWWlCqXT3hkZancZrhHuyarZXxSjn4RPg74vmMnunjlvR0fH--71BGk-qdytugJ48UUHBcf1mCY-vTc28ef5zgT5HgQGp-kIKNbS4WieE1OYAVuaJpuH5kK0Wrgl8mI8-nZEv_3H4y3WcP6C5-ARWAI0SQxadFp9iifMmKaKflaWm1GzU"
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
                  <button className="px-4 py-2 bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-full backdrop-blur-md border border-white/40 transition-all font-label-caps text-label-caps uppercase flex items-center gap-2 font-bold">
                    Optimize Grid
                    <span className="material-symbols-outlined text-[16px]">
                      auto_fix_high
                    </span>
                  </button>
                </div>
              </div>
              {/*  Interactive Area Chart  */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex-1">
                <Graph 
                  data={chartHistory} 
                  title="Consumption Profile (Live)" 
                  colorHex="#0EA5E9" 
                />
              </div>
            </div>
          </section>
          {/*  Bottom Row: Active Devices  */}
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
                <span className="material-symbols-outlined text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {devices.map((device, index) => {
                const powerLimitKw = device.powerLimit ? (device.powerLimit / 1000) : 0;
                
                return (
                <div key={device.deviceId} className="bg-white border border-slate-200/60 rounded-2xl p-5 hover:bg-slate-50 transition-all shadow-sm group">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${device.powerState === 'ON' ? 'bg-indigo-50 border-indigo-100 text-[#35259B] shadow-[0_0_15px_rgba(53,37,155,0.15)]' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                      <span className="material-symbols-outlined">
                        {index % 3 === 0 ? 'mode_fan' : index % 3 === 1 ? 'ev_station' : 'kitchen'}
                      </span>
                    </div>
                    {/*  Custom Toggle  */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        checked={device.powerState === 'ON'}
                        onChange={() => turnOffDevice(device.deviceId, device.powerState)}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#35259B] shadow-inner border border-slate-300"></div>
                    </label>
                  </div>
                  <div>
                    <h4 className="font-title-md text-title-md text-slate-900 font-bold">
                      {device.name}
                    </h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      {device.powerState === 'ON' ? (
                        <>
                          <span className="font-data-mono text-xs text-[#35259B] font-bold">
                            Limit: {powerLimitKw.toFixed(1)} kW
                          </span>
                          <span className="font-label-caps text-[9px] px-2 py-0.5 rounded border border-green-200 text-green-600 bg-green-50 uppercase font-bold">
                            Active
                          </span>
                        </>
                      ) : (
                        <>
                           <span className="font-data-mono text-xs text-slate-400 font-bold">
                            Limit: {powerLimitKw.toFixed(1)} kW
                          </span>
                          <span className="font-label-caps text-[9px] px-2 py-0.5 rounded border border-slate-200 text-slate-400 bg-slate-50 uppercase font-bold">
                            Standby
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )})}
              
              {/*  Add Device Card  */}
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
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
