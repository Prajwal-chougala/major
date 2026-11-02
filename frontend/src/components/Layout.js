import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';

function Layout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { isDarkMode, toggleDarkMode } = useTheme();
    const location = useLocation();

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-800 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex w-full min-w-0 flex-1 flex-col md:pl-72">
                <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80 md:left-72 md:px-6">
                    <div className="flex items-center">
                        <button
                            className="mr-4 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="hidden rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 md:block">
                            {location.pathname.replace('/', '') || 'overview'}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-5">
                        <button
                            onClick={toggleDarkMode}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:scale-[1.02] dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300"
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {isDarkMode ? 'light_mode' : 'dark_mode'}
                            </span>
                            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.2em]">
                                {isDarkMode ? 'Light' : 'Dark'}
                            </span>
                        </button>

                        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-700">
                            <div className="hidden text-right sm:block">
                                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Dashboard</div>
                                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Admin</div>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 shadow-md shadow-sky-500/20">
                                <span className="material-symbols-outlined text-lg text-white">person</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main key={location.pathname} className="w-full flex-1 overflow-x-hidden pt-16 animate-slide-up">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default Layout;
