import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ScreenType } from '../../types';
import {
  LayoutDashboard,
  History,
  PlusCircle,
  AlertTriangle,
  BookOpenCheck,
  MoreHorizontal,
  Car,
  CalendarCheck,
  BarChart3,
  FileText,
  Settings,
  X,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentScreen, setCurrentScreen, issues, activeVehicleId } = useApp();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const openIssuesCount = issues.filter((i) => i.vehicleId === activeVehicleId && i.status !== 'Resolved').length;

  const primaryItems: { id: ScreenType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'add-record', label: 'Add Log', icon: <PlusCircle className="w-6 h-6 text-blue-600" /> },
    {
      id: 'issues',
      label: 'Issues',
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: openIssuesCount > 0 ? openIssuesCount : undefined,
    },
    { id: 'blueprint', label: 'Blueprint', icon: <BookOpenCheck className="w-5 h-5 text-blue-600" /> },
  ];

  const secondaryItems: { id: ScreenType; label: string; icon: React.ReactNode }[] = [
    { id: 'vehicles', label: 'Vehicles', icon: <Car className="w-5 h-5" /> },
    { id: 'planner', label: 'Maintenance Planner', icon: <CalendarCheck className="w-5 h-5" /> },
    { id: 'costs', label: 'Costs & Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Secondary "More" Modal for Mobile */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="bottom-navigation__sheet border-t rounded-t-2xl p-4 shadow-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-2">
              <h3 className="font-bold text-sm">
                All Navigation Screens
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 py-2">
              {secondaryItems.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentScreen(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold min-h-[48px] ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="bottom-navigation md:hidden fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md border-t px-2 py-1 shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {primaryItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentScreen(item.id);
                  setShowMoreMenu(false);
                }}
                className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-1 py-1 rounded-lg transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 leading-none">{item.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-1 py-1 rounded-lg ${
              showMoreMenu ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
