import { useState } from 'react';
import Sidebar from './Sidebar';

function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-850 font-inter">

            {/* SIDEBAR */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT AREA */}
            <div className="md:pl-72 flex-1 w-full flex flex-col">

                {/* TOP HEADER BAR */}
                <header className="fixed top-0 left-0 md:left-72 right-0 h-16 bg-white/95 backdrop-blur-xl z-30 flex items-center justify-between px-4 md:px-6 border-b border-slate-200/60 shadow-sm">
                    
                    <div className="flex items-center">
                        <button 
                            className="md:hidden mr-4 text-slate-500 hover:text-slate-800"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Live power badge (placeholder, can be passed as children or context later) */}
                        
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <div className="text-label-caps text-slate-800 uppercase font-semibold">Dashboard</div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Admin</div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[18px]">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <main className="pt-16 flex-1 w-full overflow-x-hidden">
                    {children}
                </main>

            </div>

        </div>
    );
}

export default Layout;
