import React from 'react';
import { APP_VERSION_LABEL } from '../../appMetadata';
import { useApp } from '../../context/AppContext';
import { ScreenType } from '../../types';
import { formatMileage } from '../../utils/formatters';
import {
  Car,
  LayoutDashboard,
  Wrench,
  History,
  PlusCircle,
  AlertTriangle,
  CalendarCheck,
  BarChart3,
  FileText,
  Settings,
  BookOpenCheck,
  Moon,
  Sun,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  id: ScreenType;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
}

export const Sidebar: React.FC = () => {
  const {
    currentScreen,
    setCurrentScreen,
    vehicles,
    activeVehicleId,
    setActiveVehicleId,
    activeVehicle,
    theme,
    toggleTheme,
    issues,
    records,
  } = useApp();

  const openIssuesCount = issues.filter((i) => i.vehicleId === activeVehicleId && i.status !== 'Resolved').length;
  const activeVehicleRecordsCount = records.filter((r) => r.vehicleId === activeVehicleId).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Car className="w-4 h-4" />, badge: vehicles.length },
    { id: 'history', label: 'Service History', icon: <History className="w-4 h-4" />, badge: activeVehicleRecordsCount },
    { id: 'add-record', label: 'Add Record', icon: <PlusCircle className="w-4 h-4 text-blue-400" /> },
    {
      id: 'issues',
      label: 'Active Issues',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: openIssuesCount > 0 ? openIssuesCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
    { id: 'planner', label: 'Maintenance Planner', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'costs', label: 'Costs & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'blueprint', label: 'Project Blueprint', icon: <BookOpenCheck className="w-4 h-4 text-blue-400" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-white h-screen sticky top-0 shrink-0 select-none shadow-xl z-20">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center shadow-sm">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-white tracking-tight leading-none">
                AutoLog
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Fleet Maintenance Log</p>
          </div>
        </div>
      </div>

      {/* Active Vehicle Picker Widget */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block px-1">
          Active Fleet Vehicle
        </label>
        <div className="relative">
          <select
            value={activeVehicleId}
            onChange={(e) => setActiveVehicleId(e.target.value)}
            className="w-full appearance-none bg-slate-800 text-slate-100 font-medium text-xs border border-slate-700 rounded-md py-2 pl-3 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model} ({v.trim})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* Quick specs pill */}
        {activeVehicle && (
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between px-1 font-mono">
            <span>{formatMileage(activeVehicle.currentMileage, 'Not documented')}</span>
            <span className="text-slate-600">•</span>
            <span className="truncate max-w-[120px]">{activeVehicle.licensePlate}</span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-normal'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    item.badgeColor
                      ? item.badgeColor
                      : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme Switcher & Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-500">{theme}</span>
        </button>

        <div className="text-[10px] text-slate-500 text-center pt-1 font-mono">
          {APP_VERSION_LABEL} • Fleet Manager
        </div>
      </div>
    </aside>
  );
};
