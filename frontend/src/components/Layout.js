import { useState } from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';

function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-850 font-inter">

            {/* SIDEBAR */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT AREA */}
            <div className="md:pl-72 flex-1 w-full flex flex-col min-w-0">

                {/* TOP HEADER BAR */}
                <header className="fixed top-0 left-0 md:left-72 right-0 h-16 bg-white/95 backdrop-blur-xl z-30 flex items-center justify-between px-4 md:px-6 border-b border-slate-200/60 shadow-sm">
                    
                    <div className="flex items-center gap-3">
                        <button 
                            className="md:hidden p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open Navigation Menu"
                        >
                            <span className="material-symbols-outlined text-[22px]">menu</span>
                        </button>
                        <div className="flex items-center gap-2 md:hidden">
                            <img alt="WattWise Logo" className="h-6 w-auto" src="/logo.jpg" />
                            <span className="font-extrabold text-base text-slate-900">WattWise</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Live System</span>
                        </div>
                        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#35259B] to-[#0EA5E9] flex items-center justify-center text-white shadow-sm">
                                <span className="material-symbols-outlined text-[18px]">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <main className="pt-16 pb-20 md:pb-6 flex-1 w-full overflow-x-hidden">
                    {children}
                </main>

                {/* NATIVE MOBILE BOTTOM APP BAR */}
                <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} />

            </div>

        </div>
    );
}

export default Layout;
