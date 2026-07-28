import React, { useRef, useState } from 'react';
import { Car, Database, Plus, Sparkles, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  createSubmissionLock,
  FirstVehicleData,
  SubmissionLock,
} from '../../context/startupFlow';
import {
  parseFullBackupJson,
  ValidatedFullBackup,
} from '../../data/fullBackupRestore';

type OnboardingMode = 'chooser' | 'vehicle' | 'restore' | 'demo';
type RestoreState =
  | 'no-file'
  | 'reading'
  | 'validation-failed'
  | 'preview'
  | 'restoring'
  | 'success'
  | 'restore-failed';

export const OnboardingScreen: React.FC = () => {
  const {
    addVehicle,
    restoreFullBackupFromOnboarding,
    isFullBackupRestoreInProgress,
    loadDemoDataFromOnboarding,
    isDestructiveDataOperationInProgress,
  } = useApp();
  const submissionLock = useRef<SubmissionLock | null>(null);
  if (!submissionLock.current) {
    submissionLock.current = createSubmissionLock();
  }

  const [mode, setMode] = useState<OnboardingMode>('chooser');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [trim, setTrim] = useState('');
  const [vin, setVin] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [currentMileage, setCurrentMileage] = useState(0);
  const [restoreState, setRestoreState] = useState<RestoreState>('no-file');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [validatedBackup, setValidatedBackup] =
    useState<ValidatedFullBackup | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const vehicle: FirstVehicleData = {
      make: make.trim(),
      model: model.trim(),
      year,
      trim: trim.trim(),
      vin: vin.trim(),
      licensePlate: licensePlate.trim(),
      currentMileage: Math.max(0, Number(currentMileage) || 0),
      engine: '',
      transmission: '',
      fuelType: '',
      color: '',
      oilSpecification: '',
      tireSize: '',
      purchaseMileage: Math.max(0, Number(currentMileage) || 0),
      isPrimary: true,
      isSampleData: false,
    };

    if (!vehicle.make || !vehicle.model) {
      setError('Make and model are required.');
      return;
    }

    const started = submissionLock.current?.run(async () => {
      setIsSubmitting(true);
      try {
        await addVehicle(vehicle);
      } catch (submissionError) {
        const message =
          submissionError instanceof Error
            ? submissionError.message
            : 'The vehicle could not be saved.';
        setError(`Your vehicle was not saved: ${message}`);
      } finally {
        setIsSubmitting(false);
      }
    });
    await started;
  };

  const resetRestore = () => {
    if (restoreState === 'restoring') return;
    setRestoreState('no-file');
    setRestoreError(null);
    setValidatedBackup(null);
    setSelectedFileName(null);
  };

  const handleBackupFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setSelectedFileName(file.name);
    setValidatedBackup(null);
    setRestoreError(null);
    setRestoreState('reading');
    try {
      if (!file.name.toLowerCase().endsWith('.json')) {
        throw new Error('Choose an AutoLog .json full-backup file.');
      }
      const validated = await parseFullBackupJson(await file.text());
      setValidatedBackup(validated);
      setRestoreState('preview');
    } catch (fileError) {
      setRestoreError(
        fileError instanceof Error ? fileError.message : 'The backup could not be validated.'
      );
      setRestoreState('validation-failed');
    }
  };

  const handleRestore = async () => {
    if (!validatedBackup || restoreState !== 'preview') return;
    const started = submissionLock.current?.run(async () => {
      setRestoreError(null);
      setRestoreState('restoring');
      try {
        await restoreFullBackupFromOnboarding(validatedBackup);
        setRestoreState('success');
      } catch (restoreFailure) {
        setRestoreError(
          restoreFailure instanceof Error
            ? restoreFailure.message
            : 'The backup could not be restored.'
        );
        setRestoreState('restore-failed');
      }
    });
    await started;
  };

  const handleLoadDemo = async () => {
    const started = submissionLock.current?.run(async () => {
      setDemoError(null);
      try {
        await loadDemoDataFromOnboarding();
      } catch (demoFailure) {
        setDemoError(
          demoFailure instanceof Error
            ? demoFailure.message
            : 'The demonstration data could not be loaded.'
        );
      }
    });
    await started;
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Car className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold">Welcome to AutoLog</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Start with your first vehicle. AutoLog will not add sample data automatically.
          </p>
        </div>

        {mode === 'chooser' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setMode('vehicle')}
              className="rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 p-4 text-left hover:border-blue-500 transition-colors"
            >
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-3" />
              <span className="block text-sm font-bold">Add first vehicle</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create an empty garage for your vehicle.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('restore')}
              className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-left hover:border-emerald-500 transition-colors"
            >
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-3" />
              <span className="block text-sm font-bold">Import AutoLog backup</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                Restore a validated full JSON backup.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('demo')}
              className="rounded-xl border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 text-left hover:border-violet-500 transition-colors"
            >
              <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-3" />
              <span className="block text-sm font-bold">Load demo data</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                Explore a small, fictional vehicle history.
              </span>
            </button>
          </div>
        ) : mode === 'vehicle' ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <label className="space-y-1">
                <span className="font-semibold">Make *</span>
                <input
                  required
                  value={make}
                  onChange={(event) => setMake(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Model *</span>
                <input
                  required
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Year *</span>
                <input
                  required
                  type="number"
                  min="1886"
                  max="2100"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Current mileage</span>
                <input
                  type="number"
                  min="0"
                  value={currentMileage}
                  onChange={(event) => setCurrentMileage(Number(event.target.value))}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Trim</span>
                <input
                  value={trim}
                  onChange={(event) => setTrim(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">VIN</span>
                <input
                  value={vin}
                  onChange={(event) => setVin(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 font-mono"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="font-semibold">License plate</span>
                <input
                  value={licensePlate}
                  onChange={(event) => setLicensePlate(event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5"
                />
              </label>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('chooser');
                }}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving vehicle…' : 'Save first vehicle'}
              </button>
            </div>
          </form>
        ) : mode === 'restore' ? (
          <section className="space-y-5" aria-label="Import AutoLog backup">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
                <Upload className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <h2 className="font-bold">Restore a full AutoLog backup</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  The file is validated completely before anything is written.
                </p>
              </div>
            </div>

            <label className="block">
              <span className="sr-only">Choose AutoLog backup JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleBackupFile}
                disabled={
                  restoreState === 'reading' ||
                  restoreState === 'restoring' ||
                  isFullBackupRestoreInProgress
                }
                className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2.5 file:font-bold file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
              />
            </label>

            {restoreState === 'reading' && (
              <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
                Reading and validating {selectedFileName}…
              </p>
            )}

            {validatedBackup && restoreState !== 'validation-failed' && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div>
                  <h3 className="font-bold">Validated backup preview</h3>
                  <p className="text-xs text-slate-500">
                    Exported {new Date(validatedBackup.backup.exportedAt).toLocaleString()} ·
                    AutoLog {validatedBackup.backup.appVersion}
                  </p>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  {[
                    ['Vehicles', validatedBackup.backup.validation.counts.vehicles],
                    ['Service records', validatedBackup.backup.validation.counts.serviceRecords],
                    ['Active issues', validatedBackup.backup.validation.counts.activeIssues],
                    ['Plans', validatedBackup.backup.validation.counts.maintenancePlans],
                    ['Documents', validatedBackup.backup.validation.counts.documents],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="font-extrabold">{count}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-sm">
                  Active vehicle:{' '}
                  <strong>
                    {(() => {
                      const preferredId =
                        validatedBackup.backup.data.preferences.activeVehicleId;
                      const vehicle =
                        validatedBackup.backup.data.vehicles.find(
                          (candidate) => candidate.id === preferredId
                        ) || validatedBackup.backup.data.vehicles[0];
                      return `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.id})`;
                    })()}
                  </strong>
                </p>
                <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <li>This replaces only the currently empty onboarding database.</li>
                  <li>
                    Document metadata is included; binary document files are{' '}
                    {validatedBackup.backup.validation.includesDocumentFiles
                      ? 'included'
                      : 'not included'}.
                  </li>
                  <li>Import history is restored for this session only.</li>
                </ul>
              </div>
            )}

            {restoreError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-sm text-rose-700 dark:text-rose-300"
              >
                {restoreError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  resetRestore();
                  setMode('chooser');
                }}
                disabled={restoreState === 'restoring' || isFullBackupRestoreInProgress}
                className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              {(restoreState === 'validation-failed' ||
                restoreState === 'restore-failed') && (
                <button
                  type="button"
                  onClick={resetRestore}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Choose another file
                </button>
              )}
              <button
                type="button"
                onClick={handleRestore}
                disabled={
                  restoreState !== 'preview' ||
                  !validatedBackup ||
                  isFullBackupRestoreInProgress
                }
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {restoreState === 'restoring' ? 'Restoring…' : 'Confirm restore'}
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-5" aria-label="Load demo data">
            <div className="rounded-xl border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-2">
              <h2 className="font-extrabold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                Load fictional demonstration data?
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                This adds one fictional vehicle, three service records, two issues,
                two maintenance plans, and one document-metadata entry. No binary
                files or real owner information are included.
              </p>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Demo loading is allowed only while every local data store is empty.
              </p>
            </div>

            {demoError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-sm text-rose-700 dark:text-rose-300"
              >
                Demo data was not loaded: {demoError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDemoError(null);
                  setMode('chooser');
                }}
                disabled={isDestructiveDataOperationInProgress}
                className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLoadDemo}
                disabled={isDestructiveDataOperationInProgress}
                className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDestructiveDataOperationInProgress
                  ? 'Loading demo…'
                  : 'Confirm and load demo'}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};
