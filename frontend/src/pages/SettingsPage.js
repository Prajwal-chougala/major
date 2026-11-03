import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";

function SettingsPage() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [settings, setSettings] = useState(null);
  const [profile, setProfile] = useState({ name: "", mobile: "" });
  const [apiKey, setApiKey] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    let active = true;
    API.get("/settings")
      .then((response) => {
        if (!active) return;
        setSettings(response.data);
        setProfile({
          name: response.data.user.name || "",
          mobile: response.data.user.mobile || "",
        });
      })
      .catch((error) => {
        console.error("Could not load settings:", error);
        if (active) {
          setFeedback({
            type: "error",
            message:
              error.response?.data?.message || "Could not load account settings.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setFeedback(null);
    try {
      const response = await API.put("/settings/profile", profile);
      setSettings((current) => ({ ...current, user: response.data.user }));
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({ ...storedUser, ...response.data.user })
        );
      } catch (error) {
        console.error("Could not update the cached profile:", error);
      }
      setFeedback({ type: "success", message: response.data.message });
    } catch (error) {
      console.error("Could not save profile:", error);
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message || "Could not save profile settings.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSmsConfig = async (event) => {
    event.preventDefault();
    setSavingSms(true);
    setFeedback(null);
    try {
      const response = await API.put("/settings/sms", { apiKey });
      setSettings((current) => ({ ...current, sms: response.data.sms }));
      setApiKey("");
      setFeedback({ type: "success", message: response.data.message });
    } catch (error) {
      console.error("Could not configure Fast2SMS:", error);
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message || "Could not configure Fast2SMS.",
      });
    } finally {
      setSavingSms(false);
    }
  };

  const sendTestSms = async () => {
    setSendingTest(true);
    setFeedback(null);
    try {
      const response = await API.post("/settings/test-sms");
      setFeedback({ type: "success", message: response.data.message });
    } catch (error) {
      console.error("Could not send test SMS:", error);
      setFeedback({
        type: "error",
        message:
          error.response?.data?.message || "Could not send the test SMS.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const isAdmin = settings?.user?.role === "admin";

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 p-6 text-slate-700">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <header>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0EA5E9]">
              ACCOUNT
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900">Settings</h1>
          </header>

          {feedback && (
            <p
              role="status"
              className={`rounded-xl border p-4 text-sm ${
                feedback.type === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {feedback.message}
            </p>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-6 text-xl font-bold text-slate-900">
              Profile and notifications
            </h2>
            <form onSubmit={saveProfile} className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                Name
                <input
                  type="text"
                  required
                  minLength={2}
                  value={profile.name}
                  onChange={(event) =>
                    setProfile({ ...profile, name: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600">
                Mobile number for SMS alerts
                <input
                  type="tel"
                  value={profile.mobile}
                  onChange={(event) =>
                    setProfile({ ...profile, mobile: event.target.value })
                  }
                  placeholder="10 digits or +91"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800"
                />
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-gradient-to-r from-[#35259B] to-[#0EA5E9] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {savingProfile ? "SAVING..." : "SAVE PROFILE"}
                </button>
                <span className="text-xs text-slate-500">
                  Use a 10-digit Indian number or +91 format.
                </span>
              </div>
            </form>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <div>
                <h3 className="font-semibold text-slate-800">Dark mode</h3>
                <p className="text-xs text-slate-500">
                  Save this display preference in this browser.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDarkMode}
                onClick={toggleDarkMode}
                className={`relative h-7 w-14 rounded-full transition-colors ${
                  isDarkMode ? "bg-[#35259B]" : "bg-slate-200"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                    isDarkMode ? "left-8" : "left-1"
                  }`}
                />
              </button>
            </div>
            <p className="mt-5 text-xs text-slate-500">
              Email alerts remain enabled for the existing high-power and daily
              energy-limit notifications.
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">SMS alerts</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Provider: Fast2SMS Quick SMS
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  settings?.sms?.configured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {settings?.sms?.configured ? "CONFIGURED" : "NOT CONFIGURED"}
              </span>
            </div>

            {isAdmin ? (
              <form onSubmit={saveSmsConfig} className="mt-6 space-y-4">
                <label className="block text-sm font-semibold text-slate-600">
                  Fast2SMS API key
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800"
                    placeholder={
                      settings?.sms?.configured
                        ? "Enter a new key to replace the configured key"
                        : "Paste the Fast2SMS API key"
                    }
                  />
                </label>
                <p className="text-xs text-slate-500">
                  The key is sent to the backend over the authenticated session
                  and is never returned by settings APIs. Runtime changes last
                  until the server restarts; set FAST2SMS_API_KEY in your
                  hosting environment for persistence.
                </p>
                <button
                  type="submit"
                  disabled={savingSms || !apiKey.trim()}
                  className="rounded-xl bg-gradient-to-r from-[#35259B] to-[#0EA5E9] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {savingSms ? "SAVING..." : "SAVE FAST2SMS KEY"}
                </button>
              </form>
            ) : (
              <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                Only administrators can change provider credentials. Ask an
                administrator to configure Fast2SMS, or set FAST2SMS_API_KEY
                in the backend hosting environment.
              </p>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-sm text-slate-600">
                Test destination: {settings?.user?.mobile || "No mobile saved"}
              </p>
              <button
                type="button"
                disabled={sendingTest || !settings?.user?.mobile}
                onClick={sendTestSms}
                className="mt-3 rounded-xl border border-sky-200 px-5 py-3 text-sm font-bold text-[#0EA5E9] disabled:opacity-50"
              >
                {sendingTest ? "SENDING..." : "SEND TEST SMS"}
              </button>
              <p className="mt-3 text-xs text-slate-500">
                A provider acceptance response does not guarantee delivery to
                the phone.
              </p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export default SettingsPage;
