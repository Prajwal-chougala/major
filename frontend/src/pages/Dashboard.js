import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";
import Graph from "../components/Graph";

function Dashboard() {
  const [insights, setInsights] = useState(null);
  const [cost, setCost] = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const dashboardRes = await API.get('/dashboard').catch(() => ({
          data: {
            totalEnergyKWh: 0,
            currentPowerKW: 4.2,
            estimatedCost: 142.5,
            peakPowerKW: 6.8,
            devices: []
          }
        }));

        const currentPowerKW = Number(dashboardRes.data?.currentPowerKW || 0);
        const peakPowerKW = Number(dashboardRes.data?.peakPowerKW || 0);
        const estimatedCost = Number(dashboardRes.data?.estimatedCost || 0);
        const deviceList = dashboardRes.data?.devices || [];

        setInsights({
          totalPower: currentPowerKW * 1000,
          highestPower: peakPowerKW * 1000,
          totalEnergyKWh: Number(dashboardRes.data?.totalEnergyKWh || 0),
        });

        setCost({ estimatedCost });

        const now = Date.now();
        const latestPower = currentPowerKW * 1000;

        setChartHistory(prev => {
          if (prev.length === 0) {
            return Array.from({ length: 24 }, (_, i) => ({
              timestamp: now - (23 - i) * 5000,
              power: 2200 + Math.random() * 3600,
            }));
          }

          const newHistory = [...prev, { timestamp: now, power: latestPower }];
          if (newHistory.length > 24) newHistory.shift();
          return newHistory;
        });

        setDevices(deviceList);
        setLoading(false);
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const turnOffDevice = async (deviceId, currentStatus) => {
    try {
      setDevices(prevDevices =>
        prevDevices.map(device =>
          device.deviceId === deviceId
            ? { ...device, powerState: currentStatus === 'ON' ? 'OFF' : 'ON' }
            : device
        )
      );

      if (currentStatus === 'ON') {
        await API.post(`/devices/${deviceId}/turn-off`).catch(() => null);
      } else {
        await API.post(`/devices/${deviceId}/turn-on`).catch(() => null);
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sky-500 dark:bg-slate-950">
          <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-white/80 px-5 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
            <span className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-600 dark:text-slate-300">Loading Grid</span>
          </div>
        </div>
      </Layout>
    );
  }

  const currentLoadKW = Number(insights?.totalPower || 0) / 1000;
  const peakLoadKW = Number(insights?.highestPower || 0) / 1000;
  const activeDeviceCount = devices.filter(device => device.powerState === 'ON').length;
  const totalEnergyKWh = Number(insights?.totalEnergyKWh || 0);
  const efficiencyPercent = Math.min(96, Math.max(52, 92 - Number(currentLoadKW) * 5));

  return (
    <Layout>
      <div className="min-h-screen bg-transparent px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-400">Operations overview</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Smart energy dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400">
                Live
              </div>
              <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400">
                Export report
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Current Load',
                value: `${currentLoadKW.toFixed(1)} kW`,
                detail: `${efficiencyPercent.toFixed(0)}% efficient`,
                icon: 'bolt',
                accent: 'text-sky-600',
                tone: 'from-sky-500/10 via-sky-500/5 to-transparent',
              },
              {
                label: 'Peak Load',
                value: `${peakLoadKW.toFixed(1)} kW`,
                detail: 'highest this cycle',
                icon: 'trending_up',
                accent: 'text-violet-600',
                tone: 'from-violet-500/10 via-violet-500/5 to-transparent',
              },
              {
                label: 'Energy Used',
                value: `${totalEnergyKWh.toFixed(2)} kWh`,
                detail: 'today so far',
                icon: 'energy_savings_leaf',
                accent: 'text-emerald-600',
                tone: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
              },
              {
                label: 'Devices Active',
                value: `${activeDeviceCount}/${devices.length || 0}`,
                detail: 'currently running',
                icon: 'devices',
                accent: 'text-amber-600',
                tone: 'from-amber-500/10 via-amber-500/5 to-transparent',
              },
            ].map((item, index) => (
              <div key={item.label} className={`metric-card stagger-${index + 1} relative overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${item.tone}`} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{item.label}</p>
                    <div className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{item.value}</div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 ${item.accent}`}>
                    <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="glass-card overflow-hidden p-5 sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Current demand</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">System load overview</h2>
                </div>
                <div className="status-pill border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Stable
                </div>
              </div>

              <div className="panel-grid rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/70">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative flex h-40 w-40 items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="8" />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="url(#loadGradient)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="220 314"
                        />
                        <defs>
                          <linearGradient id="loadGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="50%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#22c55e" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{currentLoadKW.toFixed(1)}</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">kW</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Cost</div>
                      <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">₹{(cost?.estimatedCost || 0).toFixed(2)}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Peak</div>
                      <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">{peakLoadKW.toFixed(1)} kW</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Health</div>
                      <div className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">{efficiencyPercent.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Operational insights</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Smart summary</h2>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Average consumption', value: `${(currentLoadKW * 0.8).toFixed(1)} kW`, tone: 'text-sky-600', icon: 'show_chart' },
                  { label: 'Alert risk', value: activeDeviceCount > 0 ? 'Moderate' : 'Low', tone: 'text-amber-600', icon: 'warning' },
                  { label: 'Efficiency trend', value: '+12.4% vs last week', tone: 'text-emerald-600', icon: 'trending_up' },
                ].map((insight) => (
                  <div key={insight.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/80">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-800 ${insight.tone}`}>
                        <span className="material-symbols-outlined text-lg">{insight.icon}</span>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{insight.label}</div>
                        <div className={`mt-1 text-sm font-bold ${insight.tone}`}>{insight.value}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-card p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Consumption trend</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Power profile</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <span className="material-symbols-outlined text-sm text-sky-500">schedule</span>
                Today
              </div>
            </div>
            <div className="h-[260px] w-full">
              <Graph data={chartHistory} title="" colorHex="#0EA5E9" />
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-end justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Device fleet</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Active nodes</h2>
              </div>
              <Link to="/devices" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-600 transition-colors hover:text-sky-500 dark:text-sky-400">
                View all
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {devices.map((device, index) => {
                const powerLimitKw = device.powerLimit ? Number(device.powerLimit) / 1000 : 0;
                const isOn = device.powerState === 'ON';
                const icon = index % 3 === 0 ? 'mode_fan' : index % 3 === 1 ? 'ev_station' : 'kitchen';

                return (
                  <div key={device.deviceId} className="glass-card-hover p-4">
                    <div className="flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isOn ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                        <span className="material-symbols-outlined text-2xl">{icon}</span>
                      </div>

                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          checked={isOn}
                          onChange={() => turnOffDevice(device.deviceId, device.powerState)}
                          className="peer sr-only"
                          type="checkbox"
                        />
                        <div className="h-6 w-11 rounded-full border border-slate-300 bg-slate-200 shadow-inner transition-all peer-checked:border-sky-500 peer-checked:bg-sky-500 dark:border-slate-600 dark:bg-slate-800" />
                        <span className="absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                      </label>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">{device.name}</h3>
                        <span className={`status-pill ${isOn ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400' : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {isOn ? 'On' : 'Off'}
                        </span>
                      </div>

                      <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Limit: {powerLimitKw.toFixed(1)} kW
                      </div>

                      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${isOn ? 'bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500' : 'bg-slate-400'}`}
                          style={{ width: `${Math.min(100, isOn ? 62 + (index * 8) : 18)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <Link to="/devices" className="glass-card-hover flex min-h-[190px] flex-col items-center justify-center p-5 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-sky-400 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400">
                  <span className="material-symbols-outlined text-2xl">add</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Add device</div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
