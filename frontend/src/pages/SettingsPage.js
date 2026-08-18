import React from 'react';
import Layout from '../components/Layout';

function SettingsPage() {
  return (
    <Layout>
      <div className="relative bg-slate-50 min-h-screen p-6">
        <div className="flex flex-col w-full gap-8">
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-[#0EA5E9] font-bold text-[10px] tracking-widest uppercase">ACCOUNT</span>
            <h1 className="font-display-lg text-slate-900 font-extrabold">Settings</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
            <div className="col-span-12 lg:col-span-8 group relative z-10">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-8 h-full flex flex-col justify-between overflow-hidden relative shadow-sm">
                <div className="flex flex-col gap-4">
                  <h2 className="font-headline-lg text-slate-900 font-bold mb-4">General Preferences</h2>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <span className="text-slate-700 font-medium">Receive Email Alerts</span>
                    <button className="w-12 h-6 rounded-full bg-[#35259B] transition-colors relative"><div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div></button>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 pt-4">
                    <span className="text-slate-700 font-medium">Dark Mode Optimization</span>
                    <button className="w-12 h-6 rounded-full bg-slate-200 transition-colors relative"><div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div></button>
                  </div>
                  <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 pt-4">
                    <span className="text-slate-700 font-medium">Mobile Number for SMS Alerts</span>
                    <div className="flex items-center gap-4 mt-1">
                      <input type="tel" disabled value="+15551234567" className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 flex-1 text-sm outline-none" />
                      <button disabled className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">Change (Not supported yet)</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default SettingsPage;
