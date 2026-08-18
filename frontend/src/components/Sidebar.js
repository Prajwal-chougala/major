import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (onClose) onClose();
    navigate("/");
  };

  const isActive = (path) => {
    return location.pathname === path ? "bg-brand-gradient text-white shadow-[0_0_15px_rgba(14,165,233,0.4)]" : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface";
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-50 flex flex-col border-r border-slate-200/80 backdrop-blur-xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <img
              alt="Watwise Logo"
              className="h-8 w-auto object-contain"
              src="/logo.jpg"
            />
            <span className="font-bold text-lg text-slate-950">
              WattWise
            </span>
          </div>
          <button className="md:hidden text-slate-500 p-2" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <nav
          className="flex-1 px-card-padding mt-unit space-y-1"
        >
          <Link
            to="/dashboard"
            onClick={onClose}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive('/dashboard')}`}
          >
            <span className="material-symbols-outlined mr-3 group-hover:text-electric-blue">
              dashboard
            </span>
            <span className="font-body-md">Overview</span>
          </Link>
          <Link
            to="/monitoring"
            onClick={onClose}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive('/monitoring')}`}
          >
            <span className="material-symbols-outlined mr-3 group-hover:text-vibrant-violet">
              monitoring
            </span>
            <span className="font-body-md">Real-time Monitoring</span>
          </Link>
          <Link
            to="/analytics"
            onClick={onClose}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive('/analytics')}`}
          >
            <span className="material-symbols-outlined mr-3 group-hover:text-[#0EA5E9]">
              bar_chart
            </span>
            <span className="font-body-md">Analytics & Reports</span>
          </Link>
          <Link
            to="/devices"
            onClick={onClose}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive('/devices')}`}
          >
            <span className="material-symbols-outlined mr-3 group-hover:text-primary">
              devices
            </span>
            <span className="font-body-md">Devices</span>
          </Link>
          <Link
            to="/alerts"
            onClick={onClose}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive('/alerts')}`}
          >
            <span className="material-symbols-outlined mr-3 group-hover:text-error-red">
              warning
            </span>
            <span className="font-body-md">Alerts</span>
          </Link>
          <Link
            to="/profile"
            onClick={onClose}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive('/profile')}`}
          >
            <span className="material-symbols-outlined mr-3 group-hover:text-primary">
              account_circle
            </span>
            <span className="font-body-md">Profile</span>
          </Link>
          <Link
            to="/settings"
            onClick={onClose}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${isActive('/settings')}`}
          >
            <span className="material-symbols-outlined mr-3 group-hover:text-outline">
              settings
            </span>
            <span className="font-body-md">Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group text-slate-500 hover:bg-red-50 hover:text-red-600 font-medium"
          >
            <span className="material-symbols-outlined mr-3 text-red-500/80 group-hover:text-red-600">
              logout
            </span>
            <span className="font-body-md">Logout</span>
          </button>
        </nav>
        <div className="px-6 py-6 border-t border-slate-200/80">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-electric-blue animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]"></div>
            <span className="text-label-caps font-label-caps text-slate-600 font-bold uppercase">
              System: Optimal
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
