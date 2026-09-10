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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const getDeviceIcon = (name = '', location = '') => {
  const text = `${name} ${location}`.toLowerCase();
  if (text.includes('ac') || text.includes('air') || text.includes('cool')) return 'ac_unit';
  if (text.includes('fan')) return 'mode_fan';
  if (text.includes('fridge') || text.includes('refrigerator')) return 'kitchen';
  if (text.includes('tv') || text.includes('screen') || text.includes('monitor')) return 'tv';
  if (text.includes('light') || text.includes('lamp') || text.includes('bulb')) return 'light';
  if (text.includes('ev') || text.includes('charger') || text.includes('car')) return 'ev_station';
  if (text.includes('pump') || text.includes('water')) return 'water_drop';
  if (text.includes('heater') || text.includes('geyser')) return 'thermostat';
  return 'bolt';
};

function AnalyticsPage() {
  const [period, setPeriod] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [ratePerKWh, setRatePerKWh] = useState(8);
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
          const mappedData = (res.data.data || []).map(d => ({
            ...d,
            power: d.powerW !== undefined ? d.powerW : Number(d.power || 0) * 1000,
            energy: d.energyKWh !== undefined ? d.energyKWh : 0
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
      // Fetch Energy Chart Data
      const chartRes = await API.get(`/energy/chart?period=${period}`);
      const overallEnergy = Number(chartRes.data.totalEnergyKWh || 0);
      setChartData(chartRes.data.data || []);
      setTotalEnergy(overallEnergy);

      // Fetch Dashboard Data for devices and current telemetry
      const dashboardRes = await API.get('/dashboard');
      const devices = dashboardRes.data.devices || [];
      const rate = Number(dashboardRes.data.ratePerKWh || 8);
      setRatePerKWh(rate);
      setTotalCost(overallEnergy * rate);

      const breakdownPromises = devices.map(async (device) => {
        try {
          const res = await API.get(`/energy/device/${device.deviceId}`);
          const energyKWh = Math.max(Number(device.energyKWh || device.dailyEnergyKWh || 0), Number(res.data.totalEnergyKWh || 0));
          const cost = Number((energyKWh * rate).toFixed(2));
          return {
            ...device,
            energyKWh,
            cost,
            ratePerKWh: rate
          };
        } catch (err) {
          const energyKWh = Number(device.energyKWh || device.dailyEnergyKWh || 0);
          return {
            ...device,
            energyKWh,
            cost: Number((energyKWh * rate).toFixed(2)),
            ratePerKWh: rate
          };
        }
      });

      const breakdownResults = await Promise.all(breakdownPromises);
      breakdownResults.sort((a, b) => b.energyKWh - a.energyKWh);
      setDeviceBreakdown(breakdownResults);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const barChartData = {
    labels: chartData.map(d => d.label),
    datasets: [
      {
        label: 'Energy (kWh)',
        data: chartData.map(d => d.energy),
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const chartArea = context.chart.chartArea;
          if (!chartArea) return '#0EA5E9';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, '#35259B');
          gradient.addColorStop(1, '#0EA5E9');
          return gradient;
        },
        hoverBackgroundColor: '#0284C7',
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 42,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 600,
      easing: 'easeInOutQuad',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        titleFont: { family: 'Inter, sans-serif', size: 12, weight: '600' },
        bodyFont: { family: 'JetBrains Mono, monospace', size: 13, weight: '700' },
        padding: { top: 10, bottom: 10, left: 14, right: 14 },
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (context) => `⚡ Energy: ${Number(context.parsed.y).toFixed(4)} kWh (≈ ₹${(Number(context.parsed.y) * ratePerKWh).toFixed(2)})`,
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono, monospace', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.07)' },
        ticks: { 
          color: '#94a3b8', 
          font: { family: 'JetBrains Mono, monospace', size: 11 },
          callback: (value) => `${Number(value).toFixed(2)} kWh`,
        },
        beginAtZero: true
      }
    }
  };

  return (
    <Layout>
      <div className="relative bg-slate-50 min-h-screen p-6">
        <div className="flex flex-col w-full gap-8 max-w-6xl mx-auto">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between w-full gap-4">
            <div>
              <h1 className="font-display-lg text-display-lg text-slate-900 font-extrabold mb-2">
                Analytics & Insights
              </h1>
              <p className="font-body-md text-body-md text-slate-500 flex items-center gap-2 font-medium">
                Real-time energy consumption telemetry and device breakdown in Indian Rupee (₹)
              </p>
            </div>
            <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
              <button 
                onClick={() => setPeriod('today')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${period === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Today
              </button>
              <button 
                onClick={() => setPeriod('week')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${period === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setPeriod('month')}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${period === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Month
              </button>
            </div>
          </div>
          
          {/* Chart Section */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm relative">
            {loading ? (
              <div className="h-80 flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-3xl text-[#0EA5E9]">sync</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <h2 className="font-headline-md text-slate-900 font-bold">Total Energy Consumed</h2>
                    <p className="text-slate-500 text-sm mt-1">{period === 'today' ? 'Today' : period === 'week' ? 'Past 7 Days' : 'Past 30 Days'}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOTAL ENERGY</p>
                      <span className="font-mono text-3xl font-extrabold text-[#35259B]">{totalEnergy.toFixed(2)}</span>
                      <span className="text-sm font-bold text-slate-400 ml-1">kWh</span>
                    </div>
                    <div className="h-10 w-px bg-slate-200"></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ESTIMATED COST</p>
                      <span className="font-mono text-3xl font-extrabold text-emerald-600">₹ {totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <Bar data={barChartData} options={chartOptions} />
                </div>
              </>
            )}
          </div>

          {/* Breakdown Section */}
          <div className="flex justify-between items-center mt-2">
            <div>
              <h2 className="font-display-md text-slate-900 font-extrabold">Device Breakdown (Today)</h2>
              <p className="text-xs text-slate-400 font-medium">Click on any device card below to inspect live telemetry & power charts</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-[#35259B] rounded-full border border-indigo-100">
              Rate: ₹ {ratePerKWh} / kWh
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
               <div className="col-span-full h-32 flex items-center justify-center">
                 <span className="material-symbols-outlined animate-spin text-3xl text-[#0EA5E9]">sync</span>
               </div>
            ) : deviceBreakdown.length > 0 ? deviceBreakdown.map((device) => {
              const icon = getDeviceIcon(device.name, device.location);
              const totalBreakdownEnergy = deviceBreakdown.reduce((sum, d) => sum + d.energyKWh, 0);
              const percentShare = totalBreakdownEnergy > 0 ? ((device.energyKWh / totalBreakdownEnergy) * 100).toFixed(1) : 0;
              const isRunning = device.powerState === 'ON';
              
              return (
                <div 
                  key={device.deviceId} 
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#0EA5E9]/50 transition-all flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                  onClick={() => setSelectedDevice(device)}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100">
                    <div className="h-full bg-gradient-to-r from-[#35259B] to-[#0EA5E9]" style={{ width: `${percentShare}%` }}></div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${isRunning ? 'bg-indigo-50 border-indigo-100 text-[#35259B]' : 'bg-slate-50 border-slate-200/60 text-slate-400'}`}>
                          <span className="material-symbols-outlined text-[24px]">{icon}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-[#0EA5E9] transition-colors leading-tight">{device.name}</h3>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5 capitalize">{device.location || 'Unassigned'}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isRunning ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        {isRunning ? 'Running' : 'OFF'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-3">
                      <span>Energy Share</span>
                      <span className="font-mono font-bold text-slate-600">{percentShare}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t border-slate-100 pt-4 mt-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ENERGY</p>
                      <p className="font-mono text-xl font-extrabold text-slate-800">{device.energyKWh.toFixed(2)} <span className="text-xs font-semibold text-slate-400">kWh</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ESTIMATED COST</p>
                      <p className="font-mono text-xl font-extrabold text-emerald-600">₹ {device.cost.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-right">
                    <span className="text-[11px] font-bold text-[#0EA5E9] opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
                      Inspect Telemetry →
                    </span>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full text-slate-500 bg-white p-8 rounded-2xl text-center border border-slate-200 border-dashed">
                No registered devices found.
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDevice(null)}></div>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#35259B]">
                  <span className="material-symbols-outlined">{getDeviceIcon(selectedDevice.name, selectedDevice.location)}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{selectedDevice.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${selectedDevice.isOnline || selectedDevice.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      {selectedDevice.isOnline || selectedDevice.status === 'online' ? 'Hardware Online' : 'Hardware Offline'}
                    </p>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">{selectedDevice.deviceId}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDevice(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Overview Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Power State</div>
                  <div className={`font-bold flex items-center gap-1.5 ${selectedDevice.powerState === 'ON' ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${selectedDevice.powerState === 'ON' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    {selectedDevice.powerState === 'ON' ? 'Turned ON' : 'Turned OFF'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</div>
                  <div className="font-bold text-slate-700 capitalize">{selectedDevice.location || 'Unassigned'}</div>
                </div>
              </div>

              {/* Real Telemetry Metrics Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">Live Hardware Telemetry</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Power Draw</p>
                    <p className="font-mono font-extrabold text-slate-900 text-base">
                      {selectedDevice.currentPowerW !== undefined ? selectedDevice.currentPowerW : 0} <span className="text-xs text-slate-400">W</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Voltage</p>
                    <p className="font-mono font-extrabold text-slate-900 text-base">
                      {selectedDevice.voltage ? Number(selectedDevice.voltage).toFixed(1) : '230.0'} <span className="text-xs text-slate-400">V</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current</p>
                    <p className="font-mono font-extrabold text-slate-900 text-base">
                      {selectedDevice.current ? Number(selectedDevice.current).toFixed(2) : '0.00'} <span className="text-xs text-slate-400">A</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Energy Limit</p>
                    <p className="font-mono font-extrabold text-indigo-600 text-base">
                      {selectedDevice.powerLimit !== null && selectedDevice.powerLimit !== undefined ? `${selectedDevice.powerLimit} kWh` : 'None'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Power/Energy Chart */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">Telemetry Power Trace</h4>
                <div className="h-52 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center">
                  {selectedDeviceChart.length > 0 ? (
                    <Graph 
                      data={selectedDeviceChart} 
                      title="" 
                      colorHex="#0EA5E9" 
                      defaultMetric="power"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                      <span className="material-symbols-outlined text-3xl mb-2 opacity-50">show_chart</span>
                      <p className="text-xs font-semibold">No real-time telemetry trace recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Energy & Cost Breakdown in INR */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">Energy & Cost Summary (Indian Rupee ₹)</h4>
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-600">Daily Consumption</span>
                    <span className="font-mono font-bold text-slate-900">{selectedDevice.energyKWh.toFixed(3)} <span className="text-xs text-slate-400">kWh</span></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-600">Electricity Tariff Rate</span>
                    <span className="font-mono font-bold text-slate-700">₹ {selectedDevice.ratePerKWh || ratePerKWh} / kWh</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                    <span className="text-sm font-semibold text-slate-600">Estimated Today Cost</span>
                    <span className="font-mono font-extrabold text-emerald-600 text-lg">₹ {selectedDevice.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 border-dashed">
                    <span className="text-sm font-semibold text-slate-600">Projected 30-Day Cost</span>
                    <span className="font-mono font-extrabold text-[#35259B] text-lg">₹ {(selectedDevice.cost * 30).toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <p className="text-xs text-slate-400 font-semibold">
                Last Sensor Reading: {selectedDevice.lastSeen ? new Date(selectedDevice.lastSeen).toLocaleString('en-IN') : 'Recently'}
              </p>
            </div>

          </div>
        </div>
      )}
    </Layout>
  );
}

export default AnalyticsPage;
