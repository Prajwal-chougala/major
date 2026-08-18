import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    
    if (!isLogin && password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (!isLogin && !agreeTerms) {
      alert("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin ? { identifier: email, password } : { name, email, mobile, password };
      const res = await axios.post(`http://localhost:5000${endpoint}`, payload);

      const { token, user } = res.data;
      localStorage.setItem("token", token);

      const decoded = jwtDecode(token);
      const userObj = {
        id: decoded.id,
        name: user?.name || "",
        email: user?.email || "",
        mobileNumber: user?.mobileNumber || ""
      };
      localStorage.setItem("user", JSON.stringify(userObj));

      navigate("/dashboard");
    } catch (error) {
      console.error("Auth error:", error.response?.data || error.message);
      alert(
        error.response?.data?.error ||
          "Authentication failed. Please check your credentials.",
      );
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    // Reset fields
    setName("");
    setEmail("");
    setMobile("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setAgreeTerms(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-inter text-slate-800 overflow-x-hidden">
      {/* Left Column (Forms) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 md:p-20 bg-white">
        {/* Header Logo */}
        <div className="flex items-center gap-3">
          <img
            alt="Watwise Logo"
            className="h-7 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AP1WRLuJKZTRROuMjLpiKEKAXQAVJeuq3uysGxRK4TNcMh7oOK5BgDtNwaZY8dhjvFzpdk-oaQE_Is0fXGV-tmmg07j-hAmVE5kQUmpD2gfTXVNPUjz--F6wNbXHQF8upbBv8Wzdq1A_9WKb5clfPc4p6m4G4lNuMsd0yaa44XMtvDVOhPSVhT6Miv_3oRLhYLKSx5HQIiN5SRwcOr9uDxMAS9e_59XTrDhTdBbd9VBdcN6QzpsQa5-q4O2sswA"
          />
          <span className="font-bold text-lg text-slate-900 tracking-tight">
            WattWise
          </span>
        </div>

        {/* Center Content */}
        <div className="max-w-md w-full mx-auto my-auto py-10 flex flex-col justify-center">
          {isLogin ? (
            /* Login Form */
            <>
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-2">
                Welcome! Log in here.
              </h1>
              <p className="text-slate-500 mb-8 text-sm sm:text-base">
                Haven't signed up?{" "}
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="text-[#0EA5E9] hover:underline font-semibold"
                >
                  Create an account
                </button>
              </p>

              <form onSubmit={handleAuth} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="login-email"
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Enter email *
                  </label>
                  <input
                    type="email"
                    id="login-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all text-sm"
                    placeholder="e.g. manager@wattwise.net"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Enter password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="login-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all text-sm"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-sm">
                  <label className="flex items-center gap-2 text-slate-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <a
                    href="#forgot"
                    className="text-[#0EA5E9] hover:underline font-medium"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset functionality is under maintenance.");
                    }}
                  >
                    Reset Password
                  </a>
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#35259B] to-[#0EA5E9] hover:from-[#2143B8] hover:to-[#0EA5E9] text-white font-semibold rounded-full shadow-lg shadow-sky-500/10 hover:shadow-sky-500/25 transition-all text-center select-none active:scale-[0.98] text-sm"
                >
                  Log in
                </button>
              </form>
            </>
          ) : (
            /* Signup Form */
            <>
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-2">
                Create an account.
              </h1>
              <p className="text-slate-500 mb-8 text-sm sm:text-base">
                Already signed up?{" "}
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="text-[#0EA5E9] hover:underline font-semibold"
                >
                  Log in here
                </button>
              </p>

              <form onSubmit={handleAuth} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="signup-name"
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Enter full name *
                  </label>
                  <input
                    type="text"
                    id="signup-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all text-sm"
                    placeholder="e.g. Prajwal Chougala"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="signup-email"
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Enter email *
                  </label>
                  <input
                    type="email"
                    id="signup-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all text-sm"
                    placeholder="e.g. manager@wattwise.net"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="signup-mobile"
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    Enter mobile number *
                  </label>
                  <input
                    type="tel"
                    id="signup-mobile"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all text-sm"
                    placeholder="e.g. +1234567890"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-password"
                      className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      Enter password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="signup-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 pr-10 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all text-sm"
                        placeholder="Choose password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="signup-confirm"
                      className="text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      Confirm password *
                    </label>
                    <input
                      type="password"
                      id="signup-confirm"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9] transition-all text-sm"
                      placeholder="Verify password"
                    />
                  </div>
                </div>

                <div className="flex items-start mt-2">
                  <label className="flex items-start gap-2.5 text-xs text-slate-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9] cursor-pointer"
                    />
                    <span>
                      I agree to the{" "}
                      <a href="#terms" className="text-[#0EA5E9] hover:underline font-semibold">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#privacy" className="text-[#0EA5E9] hover:underline font-semibold">
                        Privacy Policy
                      </a>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#35259B] to-[#0EA5E9] hover:from-[#2143B8] hover:to-[#0EA5E9] text-white font-semibold rounded-full shadow-lg shadow-sky-500/10 hover:shadow-sky-500/25 transition-all text-center select-none active:scale-[0.98] text-sm"
                >
                  Create Account
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="text-slate-400 text-xs mt-auto pt-6 border-t border-slate-100 flex justify-between items-center">
          <span>&copy; {new Date().getFullYear()} WattWise Intelligence.</span>
          <div className="flex gap-4">
            <a href="#terms" className="hover:underline">Terms</a>
            <a href="#privacy" className="hover:underline">Privacy</a>
          </div>
        </div>
      </div>

      {/* Right Column (Visual Marketing Side) */}
      <div className="hidden lg:flex lg:w-1/2 p-6 flex-col justify-center bg-slate-50 relative">
        <div className="w-full h-full rounded-[2rem] bg-gradient-to-br from-[#35259B] via-[#2143B8] to-[#0EA5E9] p-10 md:p-14 text-white flex flex-col justify-between overflow-hidden relative shadow-2xl">
          {/* Ambient overlay background curves */}
          <div className="absolute inset-0 bg-white/[0.02] mix-blend-overlay"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-white/10 blur-[80px] pointer-events-none"></div>
          
          {/* Text block */}
          <div className="relative z-10">
            <span className="text-amber-400 font-bold text-xs uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full w-fit block mb-6">
              NEW FEATURE
            </span>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4 max-w-lg">
              Monitor, optimize, and save on power consumption with our complete toolkit
            </h2>
            <p className="text-indigo-100 text-base xl:text-lg max-w-md leading-relaxed">
              Track live telemetry, set device limits, get instant SMS alerts, and estimate monthly costs all in one place.
            </p>
          </div>

          {/* Graphical Mock Dashboard */}
          <div className="relative z-10 mt-8 w-full max-w-lg mx-auto aspect-[1.4/1] bg-[#090F12]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 overflow-hidden group">
            {/* Header bar of mock UI */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest ml-2">
                  grid_node_01.net
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
            </div>

            {/* Inner Dashboard Cards */}
            <div className="grid grid-cols-12 gap-3.5 flex-grow">
              {/* Stat card */}
              <div className="col-span-6 bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group-hover:bg-white/[0.05] transition-colors duration-300">
                <div className="flex justify-between items-center text-slate-400 text-[10px] font-bold tracking-widest uppercase">
                  <span>Current Load</span>
                  <span className="material-symbols-outlined text-[16px] text-sky-400 animate-pulse">
                    sensors
                  </span>
                </div>
                <div className="my-2.5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-white font-mono bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-sky-300">
                    4.2
                  </span>
                  <span className="text-sm font-semibold text-slate-400">kW</span>
                </div>
                {/* Micro Chart Line SVG */}
                <div className="w-full h-8 mt-1">
                  <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path
                      d="M0,25 Q15,5 30,20 T60,10 T85,15 T100,5"
                      fill="none"
                      stroke="#0EA5E9"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0,25 Q15,5 30,20 T60,10 T85,15 T100,5 L100,30 L0,30 Z"
                      fill="url(#gradient-load)"
                      opacity="0.12"
                    />
                    <defs>
                      <linearGradient id="gradient-load" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0EA5E9" />
                        <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Sub list cards */}
              <div className="col-span-6 flex flex-col gap-2.5 justify-between">
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/[0.05] transition-colors duration-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span className="text-xs font-semibold text-slate-200">HVAC System</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-300">2.1 kW</span>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/[0.05] transition-colors duration-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    <span className="text-xs font-semibold text-slate-200">EV Charger</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-300">1.8 kW</span>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/[0.05] transition-colors duration-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    <span className="text-xs font-semibold text-slate-400">Smart Fridge</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">0.3 kW</span>
                </div>
              </div>
            </div>

            {/* Overlap elements */}
            {/* Warning Message Card */}
            <div className="absolute bottom-6 left-6 right-6 bg-gradient-to-r from-red-600/90 to-amber-600/90 border border-white/15 rounded-xl p-3.5 shadow-xl flex items-center gap-3 backdrop-blur-md transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500 ease-out">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white uppercase tracking-wider">SMS Alert Sent</p>
                <p className="text-[10px] text-red-100 truncate mt-0.5">EV Charger load limit exceeded: auto-off triggered</p>
              </div>
            </div>

            {/* Float details indicator */}
            <div className="absolute top-1/4 right-3 bg-[#1C2426]/95 border border-white/15 rounded-xl p-3 shadow-xl flex flex-col gap-0.5 max-w-[130px] backdrop-blur-md transform rotate-3 translate-x-12 group-hover:translate-x-0 transition-transform duration-500 ease-out pointer-events-none">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Est. Saving</span>
              <span className="text-base font-extrabold text-green-400 font-mono">$142.50</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">12% vs last month</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
