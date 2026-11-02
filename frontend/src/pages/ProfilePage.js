import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";

function ProfilePage() {
  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  };

  const storedUser = getStoredUser();
  const [profile] = useState({ 
    name: storedUser.name || "", 
    email: storedUser.email || "", 
    mobileNumber: storedUser.mobileNumber || "" 
  });
  
  return (
    <Layout>
      <div className="relative bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300">
        <div className="flex flex-col w-full max-w-5xl mx-auto p-6 space-y-8">
          
          <header className="mb-4">
            <h1 className="font-display-lg text-display-lg text-slate-900 dark:text-white font-extrabold">
              Account Profile
            </h1>
            <p className="font-body-md text-slate-500 dark:text-slate-400 mt-1 font-medium">
              View your personal metadata
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* User Profile Info */}
            <div className="md:col-span-12 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col h-full transition-colors duration-300">
                
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#35259B] dark:text-[#818cf8] border border-indigo-100/50 dark:border-indigo-800/50 flex items-center justify-center text-2xl font-bold shadow-sm">
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.name || 'Unknown User'}</h2>
                    <span className="px-2.5 py-0.5 mt-1.5 inline-block bg-sky-50 dark:bg-sky-950/50 text-[#0EA5E9] border border-sky-100/50 dark:border-sky-800/50 rounded font-bold text-xs">
                      ADMINISTRATOR
                    </span>
                  </div>
                </div>

                <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined">info</span>
                  Profile and notification preferences can also be updated in Settings.
                </div>

                <h3 className="font-headline-md text-slate-900 dark:text-white font-bold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0EA5E9]">manage_accounts</span>
                  Profile Information
                </h3>

                <div className="flex-1 flex flex-col gap-5 justify-between">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider">EMAIL ADDRESS</label>
                      <div className="font-body-md text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 px-4 py-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                        {profile?.email || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider">NAME</label>
                      <div className="font-body-md text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 px-4 py-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                        {profile?.name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 tracking-wider">MOBILE NUMBER</label>
                      <div className="font-body-md text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 px-4 py-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                        {profile?.mobileNumber || 'N/A'}
                      </div>
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

export default ProfilePage;
