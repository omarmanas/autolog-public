import React from 'react';
import { useApp } from '../../context/AppContext';
import { ScreenType } from '../../types';
import {
  Wrench,
  Moon,
  Sun,
  Plus,
  BookOpenCheck,
  ChevronDown,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentScreen,
    setCurrentScreen,
    vehicles,
    activeVehicleId,
    setActiveVehicleId,
    activeVehicle,
    theme,
    toggleTheme,
  } = useApp();

  const titles: Record<ScreenType, { title: string; sub: string }> = {
    dashboard: { title: 'Fleet Dashboard', sub: 'Active vehicle status, mileage & upcoming service' },
    vehicles: { title: 'Garage & Fleet Vehicles', sub: 'Registered vehicles & specifications' },
    history: { title: 'Service History', sub: 'Comprehensive maintenance & repair records' },
    'add-record': { title: 'New Service Entry', sub: 'Log new maintenance or repair work' },
    issues: { title: 'Active Defect Log', sub: 'Track open issues, noises & alerts' },
    planner: { title: 'Maintenance Planner', sub: 'Intervals & projected service schedule' },
    costs: { title: 'Costs & Analytics', sub: 'Financial breakdown & cost per mile' },
    documents: { title: 'Vehicle Documents', sub: 'Invoices, manuals, & registration PDFs' },
    blueprint: { title: 'Product Blueprint', sub: 'Architecture, scope, risks & roadmap' },
    settings: { title: 'System Settings', sub: 'Preferences, units, & sample data controls' },
  };

  const activeInfo = titles[currentScreen] || { title: 'AutoLog', sub: 'Fleet Maintenance' };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-6 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Mobile Logo Brand */}
        <div className="flex md:hidden items-center gap-2">
          <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-slate-900 dark:text-slate-100 tracking-tight">
            AutoLog
          </span>
        </div>

        {/* Desktop Title Header */}
        <div className="hidden md:block">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
            {activeInfo.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {activeInfo.sub}
          </p>
        </div>

        {/* Active Vehicle Badge Pill */}
        <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs gap-2 border border-slate-200/60 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Vehicle
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
          </span>
        </div>
      </div>

      {/* Vehicle Switcher & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Dropdown Selector */}
        <div className="relative">
          <select
            value={activeVehicleId}
            onChange={(e) => setActiveVehicleId(e.target.value)}
            className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
        </div>

        {/* Quick Add Record Button */}
        <button
          onClick={() => setCurrentScreen('add-record')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
          title="Log New Service"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Add Record</span>
        </button>

        {/* Quick Blueprint Link */}
        <button
          onClick={() => setCurrentScreen('blueprint')}
          className={`p-1.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center border ${
            currentScreen === 'blueprint'
              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Project Blueprint"
        >
          <BookOpenCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
        </button>
      </div>
    </header>
  );
};
