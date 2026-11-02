import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (onClose) onClose();
    navigate("/");
  };

  const isActive = (path) => {
    return location.pathname === path
      ? "bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/20"
      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white";
  };

  const navItems = [
    { path: "/dashboard", label: "Overview", icon: "dashboard" },
    { path: "/monitoring", label: "Live Monitoring", icon: "monitoring" },
    { path: "/analytics", label: "Analytics", icon: "bar_chart" },
    { path: "/devices", label: "Devices", icon: "devices" },
    { path: "/alerts", label: "Alerts", icon: "warning" },
    { path: "/profile", label: "Profile", icon: "account_circle" },
    { path: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white/90 dark:bg-slate-950/90 z-50 flex flex-col border-r border-slate-200/80 dark:border-slate-800/90 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 shadow-lg shadow-sky-500/20">
                <span className="material-symbols-outlined text-lg text-white">bolt</span>
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">WattWise</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Energy Grid</div>
              </div>
            </div>
            <button className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-5">
          {navItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${isActive(path)}`}
            >
              <span className="material-symbols-outlined mr-3 text-base">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <span className="material-symbols-outlined mr-3 text-base">logout</span>
            <span>Logout</span>
          </button>
        </nav>

        <div className="border-t border-slate-200/80 px-4 py-4 dark:border-slate-800/80">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">System Online</span>
            </div>

            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-amber-300"
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              <span className="material-symbols-outlined text-base">{isDarkMode ? "light_mode" : "dark_mode"}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
