import React from "react";
import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="bg-slate-50 font-inter text-slate-700 min-h-screen">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm transition-all duration-300">
        <div className="h-20 w-full px-6 flex items-center justify-between mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <img
              alt="Watwise Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AP1WRLuJKZTRROuMjLpiKEKAXQAVJeuq3uysGxRK4TNcMh7oOK5BgDtNwaZY8dhjvFzpdk-oaQE_Is0fXGV-tmmg07j-hAmVE5kQUmpD2gfTXVNPUjz--F6wNbXHQF8upbBv8Wzdq1A_9WKb5clfPc4p6m4G4lNuMsd0yaa44XMtvDVOhPSVhT6Miv_3oRLhYLKSx5HQIiN5SRwcOr9uDxMAS9e_59XTrDhTdBbd9VBdcN6QzpsQa5-q4O2sswA"
            />
            <span className="font-bold text-xl text-slate-950 tracking-tight">
              WattWise
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 font-medium">
            <Link
              className="text-[#0EA5E9] font-semibold"
              to="/"
            >
              Home
            </Link>
            <a
              className="text-slate-500 hover:text-slate-900 transition-colors"
              href="#features"
            >
              Features
            </a>
            <a
              className="text-slate-500 hover:text-slate-900 transition-colors"
              href="#savings"
            >
              Savings
            </a>
            <a
              className="text-slate-500 hover:text-slate-900 transition-colors"
              href="#contact"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              to="/auth?mode=signup" 
              className="hidden sm:block px-6 py-2 bg-gradient-to-r from-[#35259B] to-[#0EA5E9] hover:from-[#2143B8] hover:to-[#0EA5E9] text-white font-semibold text-sm rounded-full shadow-md shadow-sky-500/10 hover:shadow-sky-500/25 transition-all duration-300 active:scale-95"
            >
              Get Started
            </Link>
            <Link 
              to="/auth" 
              className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">
                person
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-20 bg-slate-50">
        <div className="flex flex-col w-full relative overflow-hidden">
          
          {/* Ambient Background Blobs */}
          <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0EA5E9]/5 blur-[120px]"></div>
            <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#35259B]/5 blur-[150px]"></div>
          </div>

          {/* Hero Section */}
          <section className="relative w-full min-h-[85vh] flex items-center justify-center py-20 px-6 z-10">
            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative">
              
              {/* Left Column Text */}
              <div className="lg:col-span-6 flex flex-col gap-6 relative z-20">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/50 w-fit">
                  <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]"></span>
                  <span className="font-mono text-xs font-bold text-[#35259B] tracking-wider uppercase">
                    System Online
                  </span>
                </div>
                
                <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 leading-[1.1] tracking-tight">
                  Powering the <br />
                  <span className="text-brand-gradient">
                    Future of Your Home
                  </span>
                </h1>
                
                <p className="text-slate-500 text-base sm:text-lg max-w-xl leading-relaxed">
                  Real-time energy monitoring with AI-driven insights to save you money and power. Gain total, unified visibility into your home appliance consumption.
                </p>
                
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <Link 
                    to="/auth?mode=signup" 
                    className="px-8 py-4 bg-gradient-to-r from-[#35259B] to-[#0EA5E9] hover:from-[#2143B8] hover:to-[#0EA5E9] text-white font-bold text-sm tracking-wider uppercase rounded-full shadow-lg shadow-sky-500/15 hover:shadow-sky-500/30 transition-all duration-300 active:scale-95 flex items-center gap-2"
                  >
                    <span>Start Monitoring</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                  <Link 
                    to="/auth" 
                    className="px-8 py-4 bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100 hover:border-slate-300 font-bold text-sm tracking-wider uppercase rounded-full transition-all duration-200 active:scale-95 shadow-sm"
                  >
                    View Demo
                  </Link>
                </div>
              </div>

              {/* Right Column App Hologram Card */}
              <div className="lg:col-span-6 relative">
                <div className="relative w-full aspect-square sm:aspect-[4/3] lg:aspect-square rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 bg-white p-2">
                  <img
                    alt="Smart Home Dashboard Hologram"
                    className="w-full h-full object-cover rounded-2xl opacity-90"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBoQuC_3_syJezRcTBCAqciQdftiBRBfvFY4Lv1SydiXvMHx-NhT5l2qRaTwQQBEDzlwlS_jHuzRzyKjsKBSmTdsZVy1fVbVA8R_G3NLlUOL6GfibznCOYY71cxRmulx5gll8tj3Mim_HHmGQLRRCLPBRnUlq4ZNcS6cNPyp2JrHY7W2MWhtifG3wCVw4ueZWvvNmYrJJrAQw24gWSGT42sYAfCgzGM4urWuwMaEh6sjfYD0r1Auyas"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent pointer-events-none rounded-2xl"></div>
                  
                  {/* Floating Metric Badge */}
                  <div className="absolute bottom-6 left-6 right-6 p-5 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Current Load
                      </span>
                      <span className="text-3xl font-extrabold text-slate-900 mt-1">
                        2.4{" "}
                        <span className="text-base font-semibold text-slate-500">
                          kW
                        </span>
                      </span>
                    </div>
                    
                    <div className="w-14 h-14 relative flex items-center justify-center">
                      <svg
                        className="w-full h-full drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]"
                        viewBox="0 0 36 36"
                      >
                        <path
                          className="text-slate-100"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        ></path>
                        <path
                          className="text-[#0EA5E9] animate-[dash_2s_ease-out_forwards]"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="65, 100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        ></path>
                      </svg>
                      <span className="absolute text-[#0EA5E9] material-symbols-outlined text-[20px]">
                        bolt
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="w-full py-20 px-6 relative z-10 bg-white border-y border-slate-200/50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <span className="text-[#0EA5E9] font-bold text-xs uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full">
                  FEATURES
                </span>
                <h2 className="font-extrabold text-3xl sm:text-4xl text-slate-900 mt-4 mb-3">
                  Intelligent Control
                </h2>
                <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
                  Precision tools designed for modern energy management, utilizing advanced algorithms to optimize your home's power grid.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Feature 1 */}
                <div className="group p-8 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-3xl transition-all duration-300 relative overflow-hidden hover:shadow-lg shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0EA5E9] flex items-center justify-center mb-6 border border-sky-100/50 relative z-10 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[24px]">
                      speed
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-3 relative z-10">
                    Real-time Monitoring
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed relative z-10">
                    Visualize power consumption down to the millisecond. Identify energy hogs instantly with dynamic load tracking and status reports.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="group p-8 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-3xl transition-all duration-300 relative overflow-hidden hover:shadow-lg shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#35259B] flex items-center justify-center mb-6 border border-indigo-100/50 relative z-10 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[24px]">
                      psychology
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-3 relative z-10">
                    AI Insights
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed relative z-10">
                    Predictive modeling learns your household habits to automatically suggest optimizations and shift heavy loads to off-peak hours.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="group p-8 bg-slate-50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-3xl transition-all duration-300 relative overflow-hidden hover:shadow-lg shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-6 border border-amber-100/50 relative z-10 group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-[24px]">
                      notifications_active
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-3 relative z-10">
                    Smart Alerts
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed relative z-10">
                    Receive proactive mobile SMS notifications for abnormal usage patterns, preventing expensive surprises before your billing cycle ends.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Savings Graph Section */}
          <section id="savings" className="w-full py-20 px-6 relative z-10 bg-slate-50">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Savings graphic box (left) */}
              <div className="order-2 lg:order-1 relative h-[380px] w-full p-8 bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col justify-end">
                <div className="absolute top-8 left-8">
                  <span className="font-mono text-xs font-bold text-slate-400 block mb-1">
                    MONTHLY SAVINGS
                  </span>
                  <span className="text-3xl font-extrabold text-[#35259B] drop-shadow-[0_0_12px_rgba(53,37,155,0.1)]">
                    $342.50
                  </span>
                </div>
                
                {/* Bar Graph UI mockup */}
                <div className="w-full h-44 flex items-end justify-between gap-3.5 border-b border-slate-100 pb-4">
                  <div className="w-full bg-[#0EA5E9]/20 rounded-t-lg h-[30%] relative group hover:bg-[#0EA5E9]/40 transition-colors">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 font-mono text-[10px] text-[#0EA5E9] font-bold">
                      Mar
                    </div>
                  </div>
                  <div className="w-full bg-[#0EA5E9]/40 rounded-t-lg h-[45%] relative group hover:bg-[#0EA5E9]/60 transition-colors">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 font-mono text-[10px] text-[#0EA5E9] font-bold">
                      Apr
                    </div>
                  </div>
                  <div className="w-full bg-[#35259B]/40 rounded-t-lg h-[60%] relative group hover:bg-[#35259B]/60 transition-colors">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 font-mono text-[10px] text-[#35259B] font-bold">
                      May
                    </div>
                  </div>
                  <div className="w-full bg-[#35259B]/85 rounded-t-lg h-[85%] relative group hover:bg-[#35259B] transition-colors shadow-[0_-8px_20px_rgba(53,37,155,0.15)]">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 font-mono text-[10px] text-[#35259B] font-bold">
                      Jun
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2 font-bold tracking-widest">
                  <span>MARCH</span>
                  <span>JUNE</span>
                </div>
              </div>

              {/* Text content (right) */}
              <div className="order-1 lg:order-2 flex flex-col gap-6">
                <span className="text-[#35259B] font-bold text-xs uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full w-fit">
                  SAVINGS IMPACT
                </span>
                <h2 className="font-extrabold text-3xl sm:text-4xl text-slate-900 leading-tight">
                  Measurable Impact.
                </h2>
                <p className="text-slate-500 leading-relaxed text-base">
                  Our users see an average reduction of 24% in their monthly utility bills within the first 90 days. The analytics data speaks for itself.
                </p>
                
                <ul className="flex flex-col gap-4 mt-2">
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#0EA5E9] text-[20px] font-bold">
                      check_circle
                    </span>
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">
                      Identify phantom loads automatically
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#0EA5E9] text-[20px] font-bold">
                      check_circle
                    </span>
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">
                      Optimize solar battery storage cycles
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#0EA5E9] text-[20px] font-bold">
                      check_circle
                    </span>
                    <span className="font-semibold text-slate-700 text-sm sm:text-base">
                      Detailed tax rebate and utility reporting
                    </span>
                  </li>
                </ul>
              </div>

            </div>
          </section>

          {/* Call to Action card section */}
          <section id="contact" className="w-full py-16 px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center relative z-20">
              <div className="w-full rounded-[2.5rem] bg-gradient-to-br from-[#35259B] via-[#2143B8] to-[#0EA5E9] p-10 sm:p-16 text-white flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-white/[0.02] mix-blend-overlay pointer-events-none"></div>
                <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] rounded-full bg-white/10 blur-[80px] pointer-events-none"></div>
                
                <h2 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight relative z-10 leading-tight">
                  Join the Energy Revolution
                </h2>
                
                <p className="text-indigo-100 text-sm sm:text-base max-w-xl leading-relaxed relative z-10">
                  Take control of your footprint. Equip your home with the intelligence it needs to operate at peak efficiency.
                </p>
                
                <Link 
                  to="/auth?mode=signup" 
                  className="mt-6 px-10 py-5 bg-white text-[#2143B8] hover:text-[#35259B] font-bold text-sm tracking-wider uppercase rounded-full shadow-lg shadow-sky-950/20 hover:bg-slate-50 transition-all duration-300 active:scale-95 group relative overflow-hidden"
                >
                  <span className="relative z-10">Get Started Now</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-100 border-t border-slate-200 py-16 mt-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <img
                alt="Watwise Logo"
                className="h-6 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AP1WRLuJKZTRROuMjLpiKEKAXQAVJeuq3uysGxRK4TNcMh7oOK5BgDtNwaZY8dhjvFzpdk-oaQE_Is0fXGV-tmmg07j-hAmVE5kQUmpD2gfTXVNPUjz--F6wNbXHQF8upbBv8Wzdq1A_9WKb5clfPc4p6m4G4lNuMsd0yaa44XMtvDVOhPSVhT6Miv_3oRLhYLKSx5HQIiN5SRwcOr9uDxMAS9e_59XTrDhTdBbd9VBdcN6QzpsQa5-q4O2sswA"
              />
              <span className="font-bold text-base text-slate-900 tracking-tight">
                WattWise
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Intelligent energy management and telemetry systems for the sustainable future.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest mb-2">
              Resources
            </h4>
            <a className="text-slate-500 hover:text-[#0EA5E9] text-xs transition-colors" href="#features">Support</a>
            <a className="text-slate-500 hover:text-[#0EA5E9] text-xs transition-colors" href="#features">API Reference</a>
          </div>

          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest mb-2">
              Legal
            </h4>
            <a className="text-slate-500 hover:text-[#0EA5E9] text-xs transition-colors" href="#features">Privacy Policy</a>
            <a className="text-slate-500 hover:text-[#0EA5E9] text-xs transition-colors" href="#features">Terms of Service</a>
          </div>

          <div className="flex flex-col gap-3.5">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest mb-2">
              Social
            </h4>
            <div className="flex gap-4">
              <a className="text-slate-400 hover:text-[#35259B] transition-colors" href="#share">
                <span className="material-symbols-outlined text-[20px]">share</span>
              </a>
              <a className="text-slate-400 hover:text-[#0EA5E9] transition-colors" href="#global">
                <span className="material-symbols-outlined text-[20px]">public</span>
              </a>
            </div>
          </div>

        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-200/50 text-center">
          <p className="text-slate-400 text-[11px]">
            &copy; {new Date().getFullYear()} WattWise Intelligence. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
