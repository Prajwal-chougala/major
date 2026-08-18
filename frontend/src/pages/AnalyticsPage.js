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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function AnalyticsPage() {
  const [period, setPeriod] = useState('week');
  const [chartData, setChartData] = useState([]);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [deviceBreakdown, setDeviceBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    fetchData();
  }, [period]);

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
        backgroundColor: 'rgba(10, 15, 18, 0.9)',
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
        ticks: { color: '#859399', font: { family: 'JetBrains Mono', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#859399', font: { family: 'JetBrains Mono', size: 11 } },
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
                Analytics
              </h1>
              <p className="font-body-md text-body-md text-slate-500 flex items-center gap-2 font-medium">
                Historical energy consumption and breakdown
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
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="font-headline-md text-slate-900 font-bold">Total Energy Consumed</h2>
                    <p className="text-slate-500 text-sm mt-1">{period === 'today' ? 'Today' : period === 'week' ? 'Past 7 Days' : 'Past 30 Days'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-3xl font-extrabold text-[#35259B]">{totalEnergy.toFixed(2)}</span>
                    <span className="text-sm font-bold text-slate-400 ml-1">kWh</span>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <Bar data={barChartData} options={chartOptions} />
                </div>
              </>
            )}
          </div>

          {/* Breakdown Section */}
          <h2 className="font-display-md text-slate-900 font-extrabold mt-4">Device Breakdown (Today)</h2>
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
                  className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#0EA5E9]/30 transition-all flex flex-col justify-between cursor-pointer"
                  onClick={() => setSelectedDevice(device)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200/60 text-[#0EA5E9]">
                      <span className="material-symbols-outlined">{icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{device.name}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-wider uppercase">{device.powerState === 'ON' ? 'Running' : 'Off'}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-slate-100 pt-4 mt-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ENERGY</p>
                      <p className="font-mono text-xl font-extrabold text-slate-800">{device.energyKWh.toFixed(2)} <span className="text-xs font-semibold text-slate-400">kWh</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">COST</p>
                      <p className="font-mono text-xl font-extrabold text-[#35259B]">${device.cost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full text-slate-500 bg-white p-8 rounded-2xl text-center border border-slate-200 border-dashed">
                No devices found.
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDevice(null)}></div>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md relative z-10 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9]">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedDevice.name}</h3>
                  <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${selectedDevice.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {selectedDevice.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDevice(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">State</div>
                  <div className={`font-bold ${selectedDevice.powerState === 'ON' ? 'text-green-600' : 'text-slate-500'}`}>
                    {selectedDevice.powerState === 'ON' ? 'Turned ON' : 'Turned OFF'}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</div>
                  <div className="font-bold text-slate-700 capitalize">{selectedDevice.location || 'Unassigned'}</div>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">Live Telemetry</h4>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">Current Power Draw</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDevice.currentPowerW} <span className="text-xs text-slate-400">W</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">Power Limit</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDevice.powerLimit} <span className="text-xs text-slate-400">W</span></span>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">Energy & Cost (Today)</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">Energy Consumed</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDevice.energyKWh.toFixed(3)} <span className="text-xs text-slate-400">kWh</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-500">Estimated Cost</span>
                  <span className="font-mono font-bold text-green-600">${selectedDevice.cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100 border-dashed">
                  <span className="text-sm font-semibold text-slate-500">Projected Monthly</span>
                  <span className="font-mono font-bold text-[#35259B]">${(selectedDevice.cost * 30).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
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
