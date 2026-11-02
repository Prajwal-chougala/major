import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import API from '../services/api';

function SettingsPage() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [mobileNumber, setMobileNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // CallMeBot State (PRIMARY - free instant WhatsApp)
  const [callmebotConfig, setCallmebotConfig] = useState({
    phone: '',
    apiKey: '',
    isConfigured: false,
  });
  const [savingCallMeBot, setSavingCallMeBot] = useState(false);

  // Twilio Gateway State (SECONDARY)
  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    whatsappNumber: '+14155238886',
    phoneNumber: '',
    isConfigured: false,
    smsConfigured: false,
  });
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await API.get('/settings');
      if (res.data?.user?.mobile) {
        setMobileNumber(res.data.user.mobile);
      }
      if (res.data?.callmebot) {
        setCallmebotConfig({
          phone: res.data.callmebot.phone || '',
          apiKey: res.data.callmebot.hasApiKey ? '••••••••' : '',
          isConfigured: res.data.callmebot.isConfigured,
        });
      }
      if (res.data?.twilio) {
        setTwilioConfig({
          accountSid: res.data.twilio.accountSid || '',
          authToken: res.data.twilio.hasAuthToken ? '••••••••••••••••••••••••••••••••' : '',
          whatsappNumber: res.data.twilio.whatsappNumber || '+14155238886',
          phoneNumber: res.data.twilio.phoneNumber || '',
          isConfigured: res.data.twilio.isConfigured,
          smsConfigured: res.data.twilio.smsConfigured,
        });
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  const saveMobile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await API.put('/settings/profile', { mobile: mobileNumber });
      setStatusFeedback({ text: 'Mobile number updated successfully!', type: 'success' });
      setTimeout(() => setStatusFeedback({ text: '', type: '' }), 4000);
    } catch (error) {
      setStatusFeedback({ 
        text: error.response?.data?.message || 'Failed to update mobile number', 
        type: 'error' 
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveCallMeBot = async (e) => {
    e.preventDefault();
    try {
      setSavingCallMeBot(true);
      const res = await API.post('/settings/callmebot', callmebotConfig);
      setStatusFeedback({ 
        text: res.data.message || 'CallMeBot configured!', 
        type: res.data.testSent ? 'success' : 'error'
      });
      setCallmebotConfig(prev => ({ ...prev, isConfigured: res.data.isConfigured }));
      setTimeout(() => setStatusFeedback({ text: '', type: '' }), 6000);
    } catch (error) {
      setStatusFeedback({ 
        text: error.response?.data?.message || 'Failed to save CallMeBot settings', 
        type: 'error' 
      });
    } finally {
      setSavingCallMeBot(false);
    }
  };

  const saveTwilio = async (e) => {
    e.preventDefault();
    try {
      setSavingTwilio(true);
      const res = await API.post('/settings/twilio', twilioConfig);
      setStatusFeedback({ 
        text: res.data.message || 'Twilio Gateway settings saved!', 
        type: 'success' 
      });
      setTwilioConfig(prev => ({
        ...prev,
        isConfigured: res.data.isConfigured,
        smsConfigured: res.data.smsConfigured,
      }));
      setTimeout(() => setStatusFeedback({ text: '', type: '' }), 4000);
    } catch (error) {
      setStatusFeedback({ 
        text: error.response?.data?.message || 'Failed to save Twilio settings', 
        type: 'error' 
      });
    } finally {
      setSavingTwilio(false);
    }
  };

  return (
    <Layout>
      <div className="relative bg-slate-50 dark:bg-slate-950 min-h-screen p-6 transition-colors duration-300">
        <div className="flex flex-col w-full max-w-5xl mx-auto gap-8">
          
          <div className="flex flex-col gap-1">
            <span className="font-label-caps text-[#0EA5E9] font-bold text-[10px] tracking-widest uppercase">
              PREFERENCES & GATEWAYS
            </span>
            <h1 className="font-display-lg text-slate-900 dark:text-white font-extrabold tracking-tight">
              Settings & Integrations
            </h1>
          </div>

          {statusFeedback.text && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-scale-in ${
              statusFeedback.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              <span className="material-symbols-outlined text-base">
                {statusFeedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{statusFeedback.text}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
            
            {/* General Preferences Card */}
            <div className="col-span-12 lg:col-span-6 group relative z-10">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Display & General Preferences
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Control app appearance and system notification alerts.
                    </p>
                  </div>

                  {/* Dark Mode Optimization Toggle */}
                  <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-amber-400">
                        <span className="material-symbols-outlined text-xl">
                          {isDarkMode ? 'dark_mode' : 'light_mode'}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                          Dark Mode Optimization
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {isDarkMode ? 'Dark cyberpunk high-contrast theme' : 'Crisp daylight interface'}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={toggleDarkMode}
                      className={`w-14 h-8 rounded-full transition-colors relative p-1 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] ${
                        isDarkMode ? 'bg-[#0EA5E9]' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                      title="Toggle Dark Mode"
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-[13px] ${
                        isDarkMode ? 'translate-x-6 text-slate-800' : 'translate-x-0 text-amber-500'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {isDarkMode ? 'dark_mode' : 'light_mode'}
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Email Alerts Toggle */}
                  <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#35259B] dark:text-indigo-400">
                        <span className="material-symbols-outlined text-xl">mail</span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                          Email Safety Reports
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          Receive monthly consumption digests
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setEmailAlerts(!emailAlerts)}
                      className={`w-14 h-8 rounded-full transition-colors relative p-1 ${
                        emailAlerts ? 'bg-[#35259B]' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                        emailAlerts ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Primary Mobile Alert Recipient */}
                  <form onSubmit={saveMobile} className="flex flex-col gap-3 pt-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-sm">chat</span>
                      Default WhatsApp & SMS Alert Number
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="tel" 
                        required
                        value={mobileNumber} 
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91 98803 31429" 
                        className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white flex-1 text-sm outline-none focus:border-[#0EA5E9] font-mono transition-colors" 
                      />
                      <button 
                        type="submit" 
                        disabled={savingProfile}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#35259B] to-[#0EA5E9] text-white font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50"
                      >
                        {savingProfile ? 'SAVING...' : 'UPDATE'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Devices without a custom alert phone will dispatch spike warnings here.
                    </p>
                  </form>

                </div>
              </div>
            </div>

            {/* CallMeBot - FREE WhatsApp Gateway (PRIMARY) */}
            <div className="col-span-12 group relative z-10">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-7 flex flex-col shadow-sm hover:shadow-md transition-all">
                <form onSubmit={saveCallMeBot} className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">
                          chat
                        </span>
                        WhatsApp Instant Alerts (CallMeBot)
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Free, instant, background delivery — no paid subscription needed.
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      callmebotConfig.isConfigured 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    }`}>
                      {callmebotConfig.isConfigured ? '● Active' : '○ Not Set'}
                    </span>
                  </div>

                  {/* Setup Instructions */}
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60 rounded-2xl p-4 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                    <p className="font-bold text-sm text-emerald-800 dark:text-emerald-300">⚡ 1-Minute Setup:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Save <strong className="font-mono">+34 644 26 33 77</strong> in your phone contacts</li>
                      <li>Open WhatsApp → send: <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-mono">I allow callmebot to send me messages</code></li>
                      <li>Bot replies with your <strong>API Key</strong> — paste it below</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Your WhatsApp Number
                      </label>
                      <input 
                        type="tel" 
                        required
                        value={callmebotConfig.phone} 
                        onChange={(e) => setCallmebotConfig({...callmebotConfig, phone: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white text-sm font-mono outline-none focus:border-emerald-500 transition-colors" 
                        placeholder="+91 74118 22007" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        CallMeBot API Key
                      </label>
                      <input 
                        type="text" 
                        required
                        value={callmebotConfig.apiKey} 
                        onChange={(e) => setCallmebotConfig({...callmebotConfig, apiKey: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white text-sm font-mono outline-none focus:border-emerald-500 transition-colors" 
                        placeholder="Paste API Key from bot reply" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      type="submit" 
                      disabled={savingCallMeBot}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      {savingCallMeBot ? 'TESTING...' : 'SAVE & SEND TEST'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Twilio SMS & WhatsApp Gateway Card (SECONDARY) */}
            <div className="col-span-12 lg:col-span-6 group relative z-10">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                <form onSubmit={saveTwilio} className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-2xl">
                          cell_tower
                        </span>
                        Twilio SMS & WhatsApp Gateway
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Configure Twilio credentials and an SMS-capable sender number.
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      twilioConfig.isConfigured 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}>
                      {twilioConfig.isConfigured ? '● Active' : '○ Optional'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Twilio Account SID
                    </label>
                    <input 
                      type="text" 
                      required
                      value={twilioConfig.accountSid} 
                      onChange={(e) => setTwilioConfig({...twilioConfig, accountSid: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white text-xs font-mono outline-none focus:border-[#0EA5E9]" 
                      placeholder="AC..." 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Twilio Auth Token
                    </label>
                    <input 
                      type="password" 
                      value={twilioConfig.authToken} 
                      onChange={(e) => setTwilioConfig({...twilioConfig, authToken: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white text-xs font-mono outline-none focus:border-[#0EA5E9]" 
                      placeholder="Paste Auth Token from Twilio Console" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Twilio SMS Sender Number
                    </label>
                    <input
                      type="tel"
                      value={twilioConfig.phoneNumber}
                      onChange={(e) => setTwilioConfig({...twilioConfig, phoneNumber: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white text-xs font-mono outline-none focus:border-[#0EA5E9]"
                      placeholder="+14155551234"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Required for SMS alerts. Enter a Twilio SMS-capable number in international format.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Twilio WhatsApp Sender Number
                    </label>
                    <input 
                      type="text" 
                      value={twilioConfig.whatsappNumber} 
                      onChange={(e) => setTwilioConfig({...twilioConfig, whatsappNumber: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-white text-xs font-mono outline-none focus:border-[#0EA5E9]" 
                      placeholder="+14155238886" 
                    />
                  </div>

                  {/* Note about Twilio limitations */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base mt-0.5">info</span>
                      <div>
                        <strong className="text-slate-700 dark:text-slate-300">SMS status:</strong> {twilioConfig.smsConfigured ? 'Sender configured.' : 'Add Twilio credentials and an SMS-capable sender number to enable SMS alerts.'} Twilio may restrict trial SMS delivery to verified recipient numbers.
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit" 
                      disabled={savingTwilio}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#35259B] to-[#0EA5E9] text-white font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all shadow-md shadow-sky-500/10 disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      {savingTwilio ? 'SAVING...' : 'SAVE GATEWAY CONFIG'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Layout>
  );
}

export default SettingsPage;
