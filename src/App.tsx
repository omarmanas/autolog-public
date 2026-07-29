import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { ToastNotification } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PwaUpdatePrompt } from './components/common/PwaUpdatePrompt';

import { DashboardScreen } from './components/screens/DashboardScreen';
import { VehiclesScreen } from './components/screens/VehiclesScreen';
import { ServiceHistoryScreen } from './components/screens/ServiceHistoryScreen';
import { AddRecordScreen } from './components/screens/AddRecordScreen';
import { ActiveIssuesScreen } from './components/screens/ActiveIssuesScreen';
import { MaintenancePlannerScreen } from './components/screens/MaintenancePlannerScreen';
import { CostsScreen } from './components/screens/CostsScreen';
import { DocumentsScreen } from './components/screens/DocumentsScreen';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { resolveStartupView } from './context/startupFlow';

export const loadSettingsScreen = () =>
  import('./components/screens/SettingsScreen');
export const loadProjectBlueprintScreen = () =>
  import('./components/screens/ProjectBlueprintScreen');

const SettingsScreen = React.lazy(async () => {
  const module = await loadSettingsScreen();
  return { default: module.SettingsScreen };
});

const ProjectBlueprintScreen = React.lazy(async () => {
  const module = await loadProjectBlueprintScreen();
  return { default: module.ProjectBlueprintScreen };
});

export const ScreenLoadingFallback: React.FC = () => (
  <div
    className="token-surface rounded-xl border p-6 text-sm font-semibold"
    role="status"
    aria-live="polite"
  >
    Loading screenâ€¦
  </div>
);

export const StartupLoadingScreen: React.FC = () => (
  <div className="app-state-screen min-h-screen flex items-center justify-center p-6">
    <div className="text-center space-y-3">
      <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-sm font-semibold">Loading your garage…</p>
    </div>
  </div>
);

export const DatabaseErrorScreen: React.FC<{ error: string }> = ({ error }) => (
  <div className="app-state-screen min-h-screen flex items-center justify-center p-6">
    <div className="token-surface max-w-lg w-full rounded-2xl border border-rose-300 dark:border-rose-900 p-6 shadow-xl space-y-3">
      <h1 className="text-lg font-extrabold text-rose-700 dark:text-rose-300">
        Local database unavailable
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        AutoLog could not safely load its IndexedDB data. No sample fallback was
        substituted and editing is disabled.
      </p>
      <p className="text-xs font-mono text-rose-600 dark:text-rose-400 break-words">
        {error}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold"
      >
        Retry Reload
      </button>
    </div>
  </div>
);

export const MainContent: React.FC = () => {
  const { currentScreen, initializationError, isLoading, vehicles } = useApp();
  const startupView = resolveStartupView(
    isLoading,
    initializationError,
    vehicles.length
  );

  if (startupView === 'error') {
    return (
      <DatabaseErrorScreen
        error={initializationError || 'Unknown IndexedDB initialization error.'}
      />
    );
  }
  if (startupView === 'loading') {
    return <StartupLoadingScreen />;
  }
  if (startupView === 'onboarding') {
    return <OnboardingScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'vehicles':
        return <VehiclesScreen />;
      case 'history':
        return <ServiceHistoryScreen />;
      case 'add-record':
        return <AddRecordScreen />;
      case 'issues':
        return <ActiveIssuesScreen />;
      case 'planner':
        return <MaintenancePlannerScreen />;
      case 'costs':
        return <CostsScreen />;
      case 'documents':
        return <DocumentsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'blueprint':
        return <ProjectBlueprintScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="app-shell flex min-h-screen font-sans antialiased transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <ErrorBoundary>
            <React.Suspense fallback={<ScreenLoadingFallback />}>
              {renderScreen()}
            </React.Suspense>
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Floating Toast Notification */}
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
        <PwaUpdatePrompt />
      </AppProvider>
    </ErrorBoundary>
  );
}
