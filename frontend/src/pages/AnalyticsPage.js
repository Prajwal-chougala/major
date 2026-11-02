import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import API from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Graph from '../components/Graph';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function AnalyticsPage() {
  const { isDarkMode } = useTheme();
  const [period, setPeriod] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [deviceBreakdown, setDeviceBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedDeviceChart, setSelectedDeviceChart] = useState([]);

  useEffect(() => {
    fetchData();
  }, [period]);

  useEffect(() => {
    if (selectedDevice) {
      API.get(`/power/chart?deviceId=${selectedDevice.deviceId}`)
        .then(res => {
          // power comes in kW, Graph component expects W (or we can just map it)
          const mappedData = (res.data.data || []).map(d => ({
            ...d,
            power: d.power * 1000
          }));
          setSelectedDeviceChart(mappedData);
        })
        .catch(err => console.error("Failed to load device chart", err));
    } else {
      setSelectedDeviceChart([]);
    }
  }, [selectedDevice]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Chart Data
      const chartRes = await API.get(`/energy/chart?period=${period}`);
      setChartData(chartRes.data.data || []);
      setTotalEnergy(chartRes.data.totalEnergyKWh || 0);

      // Fetch Device Breakdown (only really need to do this once, but fine to do it here)
      const dashboardRes = await API.get('/dashboard');
      const devices = dashboardRes.data.devices || [];
      
      const breakdownPromises = devices.map(device => 
        API.get(`/energy/device/${device.deviceId}`).then(res => ({
          ...device,
          energyKWh: res.data.totalEnergyKWh || 0,
          cost: res.data.estimatedCost || 0
        })).catch(() => ({
          ...device,
          energyKWh: 0,
          cost: 0
        }))
      );
      
      const breakdownResults = await Promise.all(breakdownPromises);
      // Sort by highest energy consumer
      breakdownResults.sort((a, b) => b.energyKWh - a.energyKWh);
      setDeviceBreakdown(breakdownResults);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const forecast = React.useMemo(() => {
    const values = chartData.map(item => Number(item.energy || 0));
    const avgLoad = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const peakLoad = values.length ? Math.max(...values) : 0;
    const projectedMonthly = totalEnergy * (period === 'today' ? 30 : period === 'week' ? 4.3 : 1);
    const efficiencyScore = Math.max(55, Math.min(98, 96 - (peakLoad > 0 ? peakLoad * 1.5 : 0)));
    const risk = peakLoad > 18 ? 'High' : peakLoad > 10 ? 'Moderate' : 'Low';

    return {
      avgLoad,
      peakLoad,
      projectedMonthly,
      efficiencyScore,
      risk,
      actions: [
        peakLoad > 18 ? 'Shift heavy loads by 1–2 hours to reduce demand spikes.' : 'Load profile remains balanced and healthy.',
        totalEnergy > 70 ? 'Consider a solar/storage balancing schedule for evening demand.' : 'Current usage is in a stable range.',
        projectedMonthly > 1800 ? 'Review tariff timing and device schedules to optimize cost.' : 'Cost trend remains within target range.',
      ]
    };
  }, [chartData, totalEnergy, period]);

  const barChartData = {
    labels: chartData.map(d => d.label),
    datasets: [
      {
        label: 'Energy (kWh)',
        data: chartData.map(d => d.energy),
        backgroundColor: '#0EA5E9',
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(10, 15, 18, 0.9)',
        titleColor: isDarkMode ? '#f8fafc' : '#ffffff',
        bodyColor: isDarkMode ? '#94a3b8' : '#e2e8f0',
        borderColor: isDarkMode ? '#334155' : 'transparent',
        borderWidth: isDarkMode ? 1 : 0,
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'JetBrains Mono', size: 13 },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: isDarkMode ? '#94a3b8' : '#64748b', 
          font: { family: 'JetBrains Mono', size: 11 } 
        }
      },
      y: {
        grid: { color: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)' },
        ticks: { 
          color: isDarkMode ? '#94a3b8' : '#64748b', 
          font: { family: 'JetBrains Mono', size: 11 } 
        },
        beginAtZero: true
      }
    }
  };

  return (
    <Layout>
      <div className="relative bg-slate-50 dark:bg-slate-950 min-h-screen p-6 transition-colors duration-300">
        <div className="flex flex-col w-full gap-8 max-w-6xl mx-auto">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between w-full gap-4">
            <div>
              <h1 className="font-display-lg text-display-lg text-slate-900 dark:text-white font-extrabold mb-2">
                Analytics
              </h1>
              <p className="font-body-md text-body-md text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                Historical energy consumption and breakdown
              </p>
            </div>
            <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-xl w-fit border border-slate-200/40 dark:border-slate-700/50">
              <button 
                onClick={() => setPeriod('today')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${period === 'today' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
              >
                Today
              </button>
              <button 
                onClick={() => setPeriod('week')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${period === 'week' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setPeriod('month')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${period === 'month' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
              >
                Month
              </button>
            </div>
          </div>
          
          {/* Chart Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-sm relative transition-colors duration-300">
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-3xl text-[#0EA5E9]">sync</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="font-headline-md text-slate-900 dark:text-white font-bold">Total Energy Consumed</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{period === 'today' ? 'Today' : period === 'week' ? 'Past 7 Days' : 'Past 30 Days'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-3xl font-extrabold text-[#35259B] dark:text-[#818cf8]">{totalEnergy.toFixed(2)}</span>
                    <span className="text-sm font-bold text-slate-400 ml-1">kWh</span>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <Bar data={barChartData} options={chartOptions} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Projected monthly cost',
                value: `₹${forecast.projectedMonthly.toFixed(2)}`,
                note: 'Based on live consumption trend',
                tone: 'text-sky-600',
                icon: 'currency_rupee',
              },
              {
                label: 'Average load',
                value: `${forecast.avgLoad.toFixed(2)} kWh`,
                note: 'Mean output in selected window',
                tone: 'text-violet-600',
                icon: 'speed',
              },
              {
                label: 'Peak risk',
                value: forecast.risk,
                note: `${forecast.peakLoad.toFixed(2)} kWh peak demand`,
                tone: forecast.risk === 'High' ? 'text-amber-600' : 'text-emerald-600',
                icon: 'warning',
              },
              {
                label: 'Efficiency score',
                value: `${forecast.efficiencyScore.toFixed(0)}%`,
                note: 'Operational efficiency index',
                tone: 'text-emerald-600',
                icon: 'auto_awesome',
              },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{card.label}</div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 ${card.tone}`}>
                    <span className="material-symbols-outlined text-xl">{card.icon}</span>
                  </div>
                </div>
                <div className={`mt-4 text-2xl font-black tracking-tight ${card.tone}`}>{card.value}</div>
                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{card.note}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Smart recommendations</div>
              <div className="space-y-3">
                {forecast.actions.map((action, index) => (
                  <div key={action} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                      <span className="material-symbols-outlined text-sm">{index === 0 ? 'bolt' : index === 1 ? 'eco' : 'schedule'}</span>
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-200">{action}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Optimization summary</div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Demand smoothing</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">82%</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-sky-500 to-indigo-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Storage utilization</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">69%</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full w-[69%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                    <span>Tariff optimization</span>
                    <span className="font-bold text-violet-600 dark:text-violet-400">91%</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full w-[91%] rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Section */}
          <h2 className="font-display-md text-slate-900 dark:text-white font-extrabold mt-4">Device Breakdown (Today)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
               <div className="col-span-full h-32 flex items-center justify-center">
                 <span className="material-symbols-outlined animate-spin text-3xl text-[#0EA5E9]">sync</span>
               </div>
            ) : deviceBreakdown.length > 0 ? deviceBreakdown.map((device, index) => {
              const icon = index % 3 === 0 ? 'mode_fan' : index % 3 === 1 ? 'ev_station' : 'kitchen';
              return (
                <div 
                  key={device.deviceId} 
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#0EA5E9]/50 transition-all flex flex-col justify-between cursor-pointer"
                  onClick={() => setSelectedDevice(device)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-200/60 dark:border-slate-700 text-[#0EA5E9]">
                      <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{device.name}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-wider uppercase">{device.powerState === 'ON' ? 'Running' : 'Off'}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ENERGY (UNITS)</p>
                      <p className="font-mono text-xl font-extrabold text-slate-800 dark:text-slate-200">{device.energyKWh.toFixed(2)} <span className="text-xs font-semibold text-slate-400">Units</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">COST (INR)</p>
                      <p className="font-mono text-xl font-extrabold text-[#35259B] dark:text-[#818cf8]">₹{device.cost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-8 rounded-2xl text-center border border-slate-200 dark:border-slate-800 border-dashed">
                No devices found.
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setSelectedDevice(null)}></div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col animate-scale-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9]">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{selectedDevice.name}</h3>
                  <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${selectedDevice.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {selectedDevice.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDevice(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">State</div>
                  <div className={`font-bold ${selectedDevice.powerState === 'ON' ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {selectedDevice.powerState === 'ON' ? 'Turned ON' : 'Turned OFF'}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</div>
                  <div className="font-bold text-slate-700 dark:text-slate-300 capitalize">{selectedDevice.location || 'Unassigned'}</div>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">Live Telemetry</h4>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Current Power Draw</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedDevice.currentPowerW} <span className="text-xs text-slate-400">W</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Power Limit</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedDevice.powerLimit} <span className="text-xs text-slate-400">W</span></span>
                </div>
              </div>

              <div className="mb-6 h-48 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                {selectedDeviceChart.length > 0 ? (
                  <Graph 
                    data={selectedDeviceChart} 
                    title="Power Trace" 
                    colorHex="#0EA5E9" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                    <span className="material-symbols-outlined text-3xl mb-2 opacity-50">show_chart</span>
                    <p className="text-xs font-semibold">No real-time telemetry data available.</p>
                  </div>
                )}
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">Energy & Cost (Today)</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Energy Consumed</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedDevice.energyKWh.toFixed(3)} <span className="text-xs text-slate-400">kWh</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Estimated Cost (Today)</span>
                  <span className="font-mono font-bold text-green-600 dark:text-green-400">₹{selectedDevice.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 border-dashed">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Projected Monthly (Indian Tariff)</span>
                  <span className="font-mono font-bold text-[#35259B] dark:text-[#818cf8]">₹{(selectedDevice.cost * 30).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center">
              <p className="text-xs text-slate-400 font-semibold">
                Last Seen: {selectedDevice.lastSeen ? new Date(selectedDevice.lastSeen).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default AnalyticsPage;
