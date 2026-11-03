import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import API from '../services/api';

function SettingsPage() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [smsConfig, setSmsConfig] = useState({ configured: false, hasApiKey: false });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', success: false });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await API.get('/settings');
        setMobileNumber(data.user?.mobile || '');
        setIsAdmin(data.user?.role === 'admin');
        setSmsConfig((current) => ({ ...current, ...data.sms }));
      } catch (error) {
        setFeedback({
          text: error.response?.data?.message || 'Could not load SMS settings.',
          success: false,
        });
      }
    };

    fetchSettings();
  }, []);

  const saveMobile = async (event) => {
    event.preventDefault();
    try {
      setSavingProfile(true);
      const { data } = await API.put('/settings/profile', { mobile: mobileNumber });
      setMobileNumber(data.user.mobile);
      setFeedback({ text: 'Default SMS recipient saved.', success: true });
    } catch (error) {
      setFeedback({
        text: error.response?.data?.message || 'Could not save the recipient number.',
        success: false,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSmsConfig = async (event) => {
    event.preventDefault();
    try {
      setSavingSms(true);
      const { data } = await API.put('/settings/sms', { apiKey });
      setApiKey('');
      setSmsConfig((current) => ({ ...current, ...data.sms }));
      setFeedback({ text: data.message, success: true });
    } catch (error) {
      setFeedback({
        text: error.response?.data?.message || 'Could not save the Fast2SMS API key.',
        success: false,
      });
    } finally {
      setSavingSms(false);
    }
  };

  const sendTestSms = async () => {
    try {
      setSendingTest(true);
      const { data } = await API.post('/settings/test-sms');
      setFeedback({
        text: `${data.message}${data.status ? ` Status: ${data.status}.` : ''}`,
        success: true,
      });
    } catch (error) {
      setFeedback({
        text: error.response?.data?.message || 'Fast2SMS could not accept the test SMS.',
        success: false,
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-6 transition-colors dark:bg-slate-950">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <header>
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
              Notifications
            </span>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              SMS alerts
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              WattWise sends power-limit alerts through Fast2SMS to Indian mobile numbers.
            </p>
          </header>

          {feedback.text && (
            <div
              role="status"
              className={`rounded-2xl border p-4 text-sm ${
                feedback.success
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Fast2SMS connection
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {smsConfig.hasApiKey ? 'An API key is saved on the backend.' : 'No API key is configured yet.'}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  smsConfig.configured
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {smsConfig.configured ? 'KEY CONFIGURED' : 'NOT CONFIGURED'}
              </span>
            </div>

            {isAdmin ? (
              <form onSubmit={saveSmsConfig} className="flex flex-col gap-4">
                <label
                  htmlFor="fast2sms-api-key"
                  className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  Fast2SMS API key
                </label>
                <input
                  id="fast2sms-api-key"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={smsConfig.hasApiKey ? 'Enter a new key to replace the saved key' : 'Paste your Fast2SMS API key'}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  The key is sent to the backend and is never returned to the browser. Fast2SMS account credit and API access are required.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={savingSms || !apiKey.trim()}
                    className="rounded-xl bg-sky-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {savingSms ? 'SAVING...' : 'SAVE API KEY'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  On this server, the key is stored in the backend .env file. On hosted servers without a writable .env file, set FAST2SMS_API_KEY in the host's environment variables; a key entered here lasts only until that server restarts.
                </p>
              </form>
            ) : (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Ask your WattWise administrator to configure the Fast2SMS API key.
              </p>
            )}
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={sendTestSms}
                disabled={sendingTest || !smsConfig.configured}
                className="rounded-xl border border-slate-300 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {sendingTest ? 'SENDING...' : 'SEND TEST SMS TO MY NUMBER'}
              </button>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Sends a real, potentially billable SMS to your saved Indian mobile number.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Default SMS recipient
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Use a 10-digit Indian mobile number or a number starting with +91. Devices can override this number.
            </p>
            <form onSubmit={saveMobile} className="mt-4 flex flex-wrap gap-3">
              <input
                type="tel"
                autoComplete="tel"
                required
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
                placeholder="+919876543210"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
              >
                {savingProfile ? 'SAVING...' : 'SAVE RECIPIENT'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export default SettingsPage;
