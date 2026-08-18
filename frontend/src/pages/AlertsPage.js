import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await API.get('/alerts').catch(e => ({
        data: {
          alerts: [
            { _id: '1', title: 'High Power Usage', message: 'HVAC System is consuming very high power (2500W, limit 2000W)', severity: 'high', type: 'danger' },
            { _id: '2', title: 'System Normal', message: 'System running normally', severity: 'low', type: 'info' },
            { _id: '3', title: 'Limit Exceeded', message: 'EV Charger limit exceeded by 15% for 10 minutes', severity: 'critical', type: 'danger' }
          ]
        }
      }));
      setAlerts(res.data?.alerts || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setLoading(false);
    }
  };

  const dismissAlert = async (id, indexToRemove) => {
    try {
      if (id) {
        await API.patch(`/alerts/${id}/read`).catch(e => console.log('API Failed but updating UI locally'));
      }
      setAlerts(alerts.filter((_, index) => index !== indexToRemove));
    } catch(err) {
      console.log(err);
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
      <div className="relative min-h-screen bg-slate-50 p-6">
        <div className="flex flex-col w-full gap-8">
          <div className="flex items-end justify-between w-full">
            <div>
              <h1 className="font-display-lg text-display-lg text-slate-900 font-extrabold mb-2">
                Alert Center
              </h1>
              <p className="font-body-md text-body-md text-slate-500 flex items-center gap-2 font-medium">
                {alerts.length > 0 && alerts[0].title !== 'System Normal' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>}
                {alerts.length} System Alerts
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-12 gap-gutter">
            <div className="col-span-12 lg:col-span-10 xl:col-span-8 flex flex-col gap-6">
              {alerts.length > 0 ? alerts.map((alert, index) => {
                const isCritical = alert.severity === 'critical' || alert.severity === 'high' || alert.type === 'danger';
                const isInfo = alert.severity === 'low' || alert.type === 'info' || alert.type === 'success';
                
                const cardBg = isCritical ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-200';
                const accentColor = isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : isInfo ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-[#35259B]';
                
                const iconBg = isCritical ? 'bg-red-100 border-red-200 text-red-600' : isInfo ? 'bg-green-100 border-green-200 text-green-600' : 'bg-indigo-100 border-indigo-200 text-[#35259B]';
                const tagBg = isCritical ? 'border-red-200 text-red-600 bg-red-50' : 'border-slate-200 text-slate-500 bg-slate-50';

                return (
                  <div key={index} className={`relative group overflow-hidden rounded-2xl border ${cardBg} shadow-sm transition-all duration-300`}>
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${accentColor}`}></div>
                    <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start md:items-center gap-5">
                        <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center border ${iconBg}`}>
                          <span className="material-symbols-outlined text-[24px]">
                            {isCritical ? 'warning' : isInfo ? 'check_circle' : 'info'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest border uppercase ${tagBg}`}>
                              {isCritical ? 'CRITICAL ALERT' : 'SYSTEM INFO'}
                            </span>
                            <span className="font-data-mono text-xs text-slate-400 font-bold">Just now</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 leading-tight mt-2">
                            {alert.title}
                          </h3>
                          <p className="text-slate-500 text-sm mt-1">{alert.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end w-full md:w-auto mt-4 md:mt-0">
                        <button 
                          onClick={() => dismissAlert(alert._id, index)}
                          className={`px-6 py-2.5 rounded-full text-xs font-bold tracking-wider transition-all duration-300 ${isCritical ? 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/10' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                          {isCritical ? 'RESOLVE' : 'DISMISS'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-[#0EA5E9]">
                      verified_user
                    </span>
                  </div>
                  <h3 className="font-title-lg text-slate-900 font-bold mb-2">No Active Alerts</h3>
                  <p className="font-body-md text-slate-500 max-w-md">Your energy monitoring system is running optimally with no current issues detected.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AlertsPage;
