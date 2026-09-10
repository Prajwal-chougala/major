import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function MobileBottomNav({ onOpenMenu }) {
  const location = useLocation();

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: 'grid_view' },
    { label: 'Monitor', path: '/monitoring', icon: 'monitoring' },
    { label: 'Analytics', path: '/analytics', icon: 'bar_chart' },
    { label: 'Devices', path: '/devices', icon: 'devices' },
    { label: 'Alerts', path: '/alerts', icon: 'warning' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-1.5 flex justify-around items-center select-none">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
              isActive ? 'text-[#0EA5E9]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <span className={`material-symbols-outlined text-[24px] ${isActive ? 'font-bold' : ''}`}>
                {item.icon}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#35259B] to-[#0EA5E9]" />
              )}
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-400'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Menu / Drawer Trigger */}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[24px]">more_horiz</span>
        <span className="text-[10px] mt-0.5 font-medium tracking-tight text-slate-400">Menu</span>
      </button>
    </div>
  );
}

export default MobileBottomNav;
