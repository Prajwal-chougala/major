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
                <div key={device.deviceId} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
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
    </Layout>
  );
}

export default AnalyticsPage;
