import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  History,
  Moon,
  RotateCcw,
  Settings,
  Sun,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { downloadBackupArtifact } from '../../data/backup';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ImportWizardModal } from '../common/ImportWizardModal';

export const SettingsScreen: React.FC = () => {
  const {
    theme,
    toggleTheme,
    unitSystem,
    setUnitSystem,
    currencySymbol,
    setCurrencySymbol,
    importHistory,
    rollbackImportBatch,
    isLoading,
    isExportingBackup,
    exportFullBackup,
    showToast,
    hasRecognizedDemoData,
    isDestructiveDataOperationInProgress,
    removeDemoData,
    resetAllLocalData,
  } = useApp();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRemoveDemoConfirmOpen, setIsRemoveDemoConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [destructiveError, setDestructiveError] = useState<string | null>(null);

  const handleExportBackup = async () => {
    try {
      const artifact = await exportFullBackup();
      downloadBackupArtifact(artifact);
      showToast(`Full JSON backup exported as ${artifact.filename}`, 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown backup export error.';
      showToast(`Backup export failed: ${message}`, 'error');
    }
  };

  const handleRemoveDemo = async () => {
    setDestructiveError(null);
    try {
      await removeDemoData();
      setIsRemoveDemoConfirmOpen(false);
      showToast('Recognized demo data removed.', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown demo removal error.';
      setDestructiveError(message);
      setIsRemoveDemoConfirmOpen(false);
      showToast(`Demo removal failed: ${message}`, 'error');
    }
  };

  const handleResetAllData = async () => {
    setDestructiveError(null);
    try {
      await resetAllLocalData();
      setIsResetConfirmOpen(false);
      showToast('All local data cleared. Returning to onboarding.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown reset error.';
      setDestructiveError(message);
      setIsResetConfirmOpen(false);
      showToast(`Reset failed: ${message}`, 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>System & Preference Settings</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage imports, backups, display preferences, demo data, and local state.
          </p>
        </div>

        <button
          onClick={() => setIsImportModalOpen(true)}
          disabled={isDestructiveDataOperationInProgress}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md flex items-center gap-2 shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Import Data Wizard</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800">
          Display & Appearance
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
              Color Theme
            </div>
            <p className="text-[11px] text-slate-500">
              Toggle between dark and light display modes
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-bold text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
            <span className="capitalize">{theme} Theme</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
              Odometer Distance Unit
            </div>
            <p className="text-[11px] text-slate-500">
              Choose between miles and kilometers
            </p>
          </div>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {(['miles', 'km'] as const).map((unit) => (
              <button
                key={unit}
                onClick={() => setUnitSystem(unit)}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  unitSystem === unit
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {unit === 'miles' ? 'Miles (mi)' : 'Kilometers (km)'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
              Currency Symbol
            </div>
            <p className="text-[11px] text-slate-500">
              Choose the symbol used for financial displays
            </p>
          </div>
          <div className="flex items-center gap-1">
            {['$', '€', '£', 'C$'].map((symbol) => (
              <button
                key={symbol}
                onClick={() => setCurrencySymbol(symbol)}
                className={`w-8 h-8 rounded-lg font-mono font-bold text-xs transition-colors border ${
                  currencySymbol === symbol
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-500" />
          <span>Full Application Backup</span>
        </h3>
        <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
          <p>Includes all persisted application data and current display preferences.</p>
          <p>Documents include metadata only, not binary file contents.</p>
          <p>Import history includes only batches available in the current session.</p>
        </div>
        <button
          onClick={handleExportBackup}
          disabled={
            isLoading ||
            isExportingBackup ||
            isDestructiveDataOperationInProgress
          }
          className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>
            {isExportingBackup ? 'Exporting Backup…' : 'Export Full JSON Backup'}
          </span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-rose-700 dark:text-rose-300 pb-2 border-b border-rose-200 dark:border-rose-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Danger Zone</span>
        </h3>

        {destructiveError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-[11px] text-rose-700 dark:text-rose-300"
          >
            {destructiveError}
          </div>
        )}

        {hasRecognizedDemoData && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-violet-200 dark:border-violet-900 p-3">
            <div>
              <div className="font-bold text-xs">Recognized demo dataset</div>
              <p className="text-[11px] text-slate-500">
                Removes only the exact deterministic fictional demo manifest.
              </p>
            </div>
            <button
              onClick={() => setIsRemoveDemoConfirmOpen(true)}
              disabled={isDestructiveDataOperationInProgress}
              className="px-3.5 py-2 rounded-lg bg-violet-600 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove demo data
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-3">
          <div>
            <div className="font-bold text-xs">Reset all local data</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Export a full backup first. Reset permanently clears all five local
              data stores and returns AutoLog to onboarding.
            </p>
          </div>
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={isDestructiveDataOperationInProgress}
            className="px-3.5 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset all local data
          </button>
        </div>
      </div>

      {importHistory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            <span>Import History & Rollback Logs</span>
          </h3>
          <div className="space-y-3">
            {importHistory.map((batch) => (
              <div
                key={batch.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold font-mono text-slate-900 dark:text-slate-100">
                    {batch.filename}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Batch ID: {batch.id} · {new Date(batch.timestamp).toLocaleString()} ·{' '}
                    {batch.recordsAdded} records
                  </p>
                </div>
                <button
                  onClick={() => rollbackImportBatch(batch.id)}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rollback Batch</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isRemoveDemoConfirmOpen}
        title="Remove Recognized Demo Data?"
        message="Only the exact fictional demo vehicle, records, issues, plans, and document metadata will be removed. Any identity mismatch aborts the entire transaction."
        confirmText="Remove Demo Data"
        cancelText="Cancel"
        variant="warning"
        isConfirming={isDestructiveDataOperationInProgress}
        confirmDisabled={isDestructiveDataOperationInProgress}
        onConfirm={handleRemoveDemo}
        onCancel={() => setIsRemoveDemoConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset All Local AutoLog Data?"
        message="All local vehicles, service records, active issues, maintenance plans, and document metadata will be permanently deleted. This cannot be undone without a backup, and AutoLog will return to onboarding."
        confirmText="Reset All Local Data"
        cancelText="Cancel"
        variant="danger"
        isConfirming={isDestructiveDataOperationInProgress}
        confirmDisabled={isDestructiveDataOperationInProgress}
        onConfirm={handleResetAllData}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      <ImportWizardModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
