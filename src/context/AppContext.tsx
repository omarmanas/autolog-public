import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Vehicle,
  ServiceRecord,
  ActiveIssue,
  MaintenancePlan,
  Attachment,
  ScreenType,
} from '../types';
import {
  initIndexedDB,
  saveVehicleToIDB,
  saveRecordToIDB,
  saveRecordAndVehicleToIDB,
  deleteRecordFromIDB,
  saveIssueToIDB,
  deleteIssueFromIDB,
  saveTaskToIDB,
  deleteTaskFromIDB,
  saveDocumentToIDB,
  replaceAllStoresAtomically,
  readIndexedDBSnapshot,
  loadDemoDataIntoEmptyIDB,
  removeExactDemoDataFromIDB,
  clearAllIndexedDB,
} from '../data/idb';
import {
  BackupArtifact,
  createBackupArtifact,
} from '../data/backup';
import {
  persistRestoreThenApply,
  ValidatedFullBackup,
} from '../data/fullBackupRestore';
import { createEntityId } from '../utils/ids';
import {
  PendingWriteGate,
  persistThenCommit,
  resolveStoredActiveVehicleId,
} from './persistenceGuards';
import { persistFirstVehicle, resolveActiveVehicle } from './startupFlow';
import { ImportBatchRecord } from '../types';
import {
  containsRecognizedDemoManifest,
  DEMO_DATA,
  DEMO_ID_MANIFEST,
  DEMO_VEHICLE_ID,
} from '../data/demoData';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  isLoading: boolean;
  initializationError: string | null;
  pendingWriteCount: number;
  vehicles: Vehicle[];
  activeVehicleId: string | null;
  activeVehicle: Vehicle | null;
  records: ServiceRecord[];
  issues: ActiveIssue[];
  maintenanceTasks: MaintenancePlan[];
  documents: Attachment[];
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  currentScreen: ScreenType;
  unitSystem: 'miles' | 'km';
  currencySymbol: string;
  toast: Toast | null;
  isExportingBackup: boolean;
  isFullBackupRestoreInProgress: boolean;
  isDestructiveDataOperationInProgress: boolean;
  hasRecognizedDemoData: boolean;

  // Actions
  setActiveVehicleId: (id: string) => void;
  setCurrentScreen: (screen: ScreenType) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  setUnitSystem: (unit: 'miles' | 'km') => void;
  setCurrencySymbol: (symbol: string) => void;

  // Entity CRUD
  addRecord: (record: Omit<ServiceRecord, 'id'>) => Promise<void>;
  updateRecord: (record: ServiceRecord) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;

  addIssue: (issue: Omit<ActiveIssue, 'id'>) => Promise<void>;
  updateIssue: (issue: ActiveIssue) => Promise<void>;
  resolveIssue: (id: string, recordTitle?: string) => Promise<void>;
  deleteIssue: (id: string) => Promise<void>;

  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  updateVehicleMileage: (vehicleId: string, newMileage: number) => Promise<void>;

  addMaintenanceTask: (task: Omit<MaintenancePlan, 'id'>) => Promise<void>;
  updateMaintenanceTask: (task: MaintenancePlan) => Promise<void>;
  deleteMaintenanceTask: (id: string) => Promise<void>;

  addDocument: (doc: Omit<Attachment, 'id'>) => Promise<void>;
  importHistory: ImportBatchRecord[];
  addImportBatch: (data: {
    batchId: string;
    filename: string;
    records: ServiceRecord[];
    issues: ActiveIssue[];
    maintenanceTasks: MaintenancePlan[];
    documents: Attachment[];
  }) => ImportBatchRecord;
  rollbackImportBatch: (batchId: string) => void;
  exportFullBackup: () => Promise<BackupArtifact>;
  restoreFullBackupFromOnboarding: (backup: ValidatedFullBackup) => Promise<void>;
  loadDemoDataFromOnboarding: () => Promise<void>;
  removeDemoData: () => Promise<void>;
  resetAllLocalData: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  checkDuplicateInvoiceNumber: (vehicleId: string, invoiceNumber: string, currentRecordId?: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const applyResolvedTheme = (
  root: Pick<HTMLElement, 'classList' | 'dataset'>,
  resolvedTheme: 'light' | 'dark'
) => {
  if (resolvedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.dataset.theme = resolvedTheme;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [pendingWriteCount, setPendingWriteCount] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicleId, setActiveVehicleIdState] = useState<string | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [issues, setIssues] = useState<ActiveIssue[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenancePlan[]>([]);
  const [documents, setDocuments] = useState<Attachment[]>([]);

  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('autolog_theme');
    return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Listen for OS system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [unitSystem, setUnitSystemState] = useState<'miles' | 'km'>('miles');
  const [currencySymbol, setCurrencySymbolState] = useState<string>('$');

  const [toast, setToast] = useState<Toast | null>(null);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isFullBackupRestoreInProgress, setIsFullBackupRestoreInProgress] =
    useState(false);
  const [
    isDestructiveDataOperationInProgress,
    setIsDestructiveDataOperationInProgress,
  ] = useState(false);
  const exportLockRef = useRef(false);
  const fullRestoreLockRef = useRef(false);
  const destructiveDataLockRef = useRef(false);
  const pendingWriteGateRef = useRef(
    new PendingWriteGate((pending) => setPendingWriteCount(pending))
  );

  // Load IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    initIndexedDB()
      .then((data) => {
        if (!isMounted) return;
        setVehicles(data.vehicles);
        setRecords(data.records);
        setIssues(data.issues);
        setMaintenanceTasks(data.maintenanceTasks);
        setDocuments(data.documents);

        const savedActiveVeh = localStorage.getItem('autolog_active_vehicle');
        const resolvedVehicleId = resolveStoredActiveVehicleId(
          data.vehicles.map((vehicle) => vehicle.id),
          savedActiveVeh,
          () => localStorage.removeItem('autolog_active_vehicle')
        );
        setActiveVehicleIdState(resolvedVehicleId);
        setInitializationError(null);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        const message =
          error instanceof Error ? error.message : 'Unknown IndexedDB initialization error.';
        setInitializationError(message);
        setIsLoading(false);
        setToast({
          id: Date.now().toString(),
          message: `Local database failed to load: ${message}`,
          type: 'error',
        });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync dark class on html document
  useEffect(() => {
    applyResolvedTheme(document.documentElement, resolvedTheme);
    localStorage.setItem('autolog_theme', theme);
  }, [theme, resolvedTheme]);

  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const newToast = { id: Date.now().toString(), message, type };
    setToast(newToast);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const activeVehicle = resolveActiveVehicle(vehicles, activeVehicleId);

  const setActiveVehicleId = (id: string) => {
    if (!vehicles.some((vehicle) => vehicle.id === id)) {
      localStorage.removeItem('autolog_active_vehicle');
      setActiveVehicleIdState(
        resolveStoredActiveVehicleId(
          vehicles.map((vehicle) => vehicle.id),
          null,
          () => localStorage.removeItem('autolog_active_vehicle')
        )
      );
      showToast('The selected vehicle no longer exists. Active vehicle was reset.', 'warning');
      return;
    }
    setActiveVehicleIdState(id);
    localStorage.setItem('autolog_active_vehicle', id);
    const v = vehicles.find((veh) => veh.id === id);
    if (v) {
      showToast(`Switched active vehicle to ${v.year} ${v.make} ${v.model}`, 'info');
    }
  };

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    const label = newTheme.charAt(0).toUpperCase() + newTheme.slice(1);
    showToast(`Theme set to ${label}`, 'info');
  };

  const toggleTheme = () => {
    const nextTheme: 'light' | 'dark' | 'system' =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  };

  const checkDuplicateInvoiceNumber = (vehicleId: string, invoiceNumber: string, currentRecordId?: string): boolean => {
    if (!invoiceNumber || !invoiceNumber.trim()) return false;
    const cleanInv = invoiceNumber.trim().toLowerCase();
    return records.some(
      (r) =>
        r.vehicleId === vehicleId &&
        r.id !== currentRecordId &&
        r.invoiceNumber &&
        r.invoiceNumber.trim().toLowerCase() === cleanInv
    );
  };

  const waitForPendingWrites = (): Promise<void> => {
    return pendingWriteGateRef.current.waitForIdle();
  };

  const runOrdinaryWrite = async (
    operation: () => Promise<void>,
    failureLabel: string
  ): Promise<void> => {
    if (isLoading || initializationError) {
      throw new Error('Local database is not ready for changes.');
    }
    if (exportLockRef.current) {
      throw new Error('A backup export is in progress.');
    }
    if (fullRestoreLockRef.current) {
      throw new Error('Full backup restore is in progress.');
    }
    if (destructiveDataLockRef.current) {
      throw new Error('A demo or reset operation is in progress.');
    }

    const finishWrite = pendingWriteGateRef.current.begin();
    try {
      await operation();
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown persistence error.';
      showToast(`${failureLabel}: ${detail}`, 'error');
      throw error;
    } finally {
      finishWrite();
    }
  };

  // --- RECORDS ---
  const addRecord = async (newRecordData: Omit<ServiceRecord, 'id'>): Promise<void> => {
    const recordMileage = newRecordData.mileageIn ?? newRecordData.mileage ?? 0;
    const recordTitle = newRecordData.title || newRecordData.workPerformed || 'Service Record';

    const newRecord: ServiceRecord = {
      ...newRecordData,
      id: createEntityId('rec-'),
      mileageIn: newRecordData.mileageIn,
      mileage: newRecordData.mileage,
      title: recordTitle,
      workPerformed: newRecordData.workPerformed || recordTitle,
      date: newRecordData.date ?? newRecordData.serviceDate,
      serviceDate: newRecordData.serviceDate ?? newRecordData.date,
      partsReplaced: newRecordData.partsReplaced || [],
      fluidsAndMaterials: newRecordData.fluidsAndMaterials || [],
      tags: newRecordData.tags || [],
    };
    const mileageVehicle = vehicles.find(
      (vehicle) => vehicle.id === newRecord.vehicleId
    );
    const updatedMileageVehicle =
      mileageVehicle && recordMileage > mileageVehicle.currentMileage
        ? { ...mileageVehicle, currentMileage: recordMileage }
        : null;

    await persistThenCommit(
      () =>
        runOrdinaryWrite(
          () =>
            updatedMileageVehicle
              ? saveRecordAndVehicleToIDB(newRecord, updatedMileageVehicle)
              : saveRecordToIDB(newRecord),
          `Service record "${recordTitle}" was not saved`
        ),
      () => {
        setRecords((prev) => [newRecord, ...prev]);
        if (updatedMileageVehicle) {
          setVehicles((prev) =>
            prev.map((vehicle) =>
              vehicle.id === updatedMileageVehicle.id
                ? updatedMileageVehicle
                : vehicle
            )
          );
        }
      }
    );

    if (newRecord.invoiceNumber && checkDuplicateInvoiceNumber(newRecord.vehicleId, newRecord.invoiceNumber, newRecord.id)) {
      showToast(`Saved record. Warning: Invoice/RO #${newRecord.invoiceNumber} is a duplicate RO number for this vehicle.`, 'warning');
    } else {
      showToast(`Service record "${recordTitle}" saved successfully`, 'success');
    }
  };

  const updateRecord = async (updatedRecord: ServiceRecord): Promise<void> => {
    const recordMileage = updatedRecord.mileageIn ?? updatedRecord.mileage ?? 0;
    const mileageVehicle = vehicles.find(
      (vehicle) => vehicle.id === updatedRecord.vehicleId
    );
    const updatedMileageVehicle =
      mileageVehicle && recordMileage > mileageVehicle.currentMileage
        ? { ...mileageVehicle, currentMileage: recordMileage }
        : null;
    await persistThenCommit(
      () =>
        runOrdinaryWrite(
          () =>
            updatedMileageVehicle
              ? saveRecordAndVehicleToIDB(updatedRecord, updatedMileageVehicle)
              : saveRecordToIDB(updatedRecord),
          'Service record update failed'
        ),
      () => {
        setRecords((prev) =>
          prev.map((record) =>
            record.id === updatedRecord.id ? updatedRecord : record
          )
        );
        if (updatedMileageVehicle) {
          setVehicles((prev) =>
            prev.map((vehicle) =>
              vehicle.id === updatedMileageVehicle.id
                ? updatedMileageVehicle
                : vehicle
            )
          );
        }
      }
    );

    showToast(`Service record updated`, 'success');
  };

  const deleteRecord = async (id: string): Promise<void> => {
    await persistThenCommit(
      () =>
        runOrdinaryWrite(
          () => deleteRecordFromIDB(id),
          'Service record deletion failed'
        ),
      () => setRecords((prev) => prev.filter((record) => record.id !== id))
    );
    showToast('Service record deleted', 'warning');
  };

  // --- ISSUES ---
  const addIssue = async (newIssueData: Omit<ActiveIssue, 'id'>): Promise<void> => {
    const newIssue: ActiveIssue = {
      ...newIssueData,
      id: createEntityId('iss-'),
      tags: newIssueData.tags || [],
    };
    await persistThenCommit(
      () =>
        runOrdinaryWrite(
          () => saveIssueToIDB(newIssue),
          `Active issue "${newIssue.title}" was not saved`
        ),
      () => setIssues((prev) => [newIssue, ...prev])
    );
    showToast(`Active issue "${newIssue.title}" reported`, 'success');
  };

  const updateIssue = async (updatedIssue: ActiveIssue): Promise<void> => {
    await persistThenCommit(
      () =>
        runOrdinaryWrite(
          () => saveIssueToIDB(updatedIssue),
          `Issue "${updatedIssue.title}" update failed`
        ),
      () =>
        setIssues((prev) =>
          prev.map((issue) =>
            issue.id === updatedIssue.id ? updatedIssue : issue
          )
        )
    );
    showToast(`Issue "${updatedIssue.title}" updated`, 'success');
  };

  const resolveIssue = async (id: string, recordTitle?: string): Promise<void> => {
    const existing = issues.find((issue) => issue.id === id);
    if (!existing) return;
    const updated: ActiveIssue = {
      ...existing,
      status: 'Resolved',
      resolvedDate: new Date().toISOString().split('T')[0],
    };
    await runOrdinaryWrite(
      () => saveIssueToIDB(updated),
      `Issue "${existing.title}" resolution failed`
    );
    setIssues((prev) => prev.map((issue) => (issue.id === id ? updated : issue)));
    showToast(`Issue resolved ${recordTitle ? `and linked to record: ${recordTitle}` : ''}`, 'success');
  };

  const deleteIssue = async (id: string): Promise<void> => {
    await persistThenCommit(
      () =>
        runOrdinaryWrite(
          () => deleteIssueFromIDB(id),
          'Active issue deletion failed'
        ),
      () => setIssues((prev) => prev.filter((issue) => issue.id !== id))
    );
    showToast('Active issue deleted', 'warning');
  };

  // --- VEHICLES ---
  const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<void> => {
    const newVeh: Vehicle = {
      ...vehicleData,
      id: createEntityId('veh-'),
    };
    await persistFirstVehicle(
      () =>
        runOrdinaryWrite(
          () => saveVehicleToIDB(newVeh),
          `Vehicle ${newVeh.year} ${newVeh.make} ${newVeh.model} was not saved`
        ),
      () => {
        setVehicles((prev) => [...prev, newVeh]);
        setActiveVehicleIdState(newVeh.id);
        localStorage.setItem('autolog_active_vehicle', newVeh.id);
      }
    );
    showToast(`Added ${newVeh.year} ${newVeh.make} ${newVeh.model} to garage`, 'success');
  };

  const updateVehicle = async (updatedVeh: Vehicle): Promise<void> => {
    await runOrdinaryWrite(
      () => saveVehicleToIDB(updatedVeh),
      `Vehicle ${updatedVeh.year} ${updatedVeh.make} ${updatedVeh.model} update failed`
    );
    setVehicles((prev) => prev.map((v) => (v.id === updatedVeh.id ? updatedVeh : v)));
    showToast(`Vehicle profile for ${updatedVeh.year} ${updatedVeh.make} ${updatedVeh.model} updated`, 'success');
  };

  const updateVehicleMileage = async (
    vehicleId: string,
    newMileage: number
  ): Promise<void> => {
    const existing = vehicles.find((vehicle) => vehicle.id === vehicleId);
    if (!existing) return;
    const updated = {
      ...existing,
      currentMileage: Math.max(existing.currentMileage, newMileage),
    };
    await runOrdinaryWrite(
      () => saveVehicleToIDB(updated),
      'Vehicle mileage update failed'
    );
    setVehicles((prev) => prev.map((vehicle) => (vehicle.id === vehicleId ? updated : vehicle)));
  };

  // --- MAINTENANCE TASKS / PLANS ---
  const addMaintenanceTask = async (
    taskData: Omit<MaintenancePlan, 'id'>
  ): Promise<void> => {
    const newTask: MaintenancePlan = {
      ...taskData,
      id: createEntityId('task-'),
    };
    await runOrdinaryWrite(
      () => saveTaskToIDB(newTask),
      `Maintenance plan "${newTask.title}" was not saved`
    );
    setMaintenanceTasks((prev) => [...prev, newTask]);
    showToast(`Maintenance plan "${newTask.title}" created`, 'success');
  };

  const updateMaintenanceTask = async (
    updatedTask: MaintenancePlan
  ): Promise<void> => {
    await runOrdinaryWrite(
      () => saveTaskToIDB(updatedTask),
      `Maintenance plan "${updatedTask.title}" update failed`
    );
    setMaintenanceTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    showToast(`Maintenance plan "${updatedTask.title}" updated`, 'success');
  };

  const deleteMaintenanceTask = async (id: string): Promise<void> => {
    await runOrdinaryWrite(
      () => deleteTaskFromIDB(id),
      'Maintenance plan deletion failed'
    );
    setMaintenanceTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Maintenance task deleted', 'warning');
  };

  // --- DOCUMENTS ---
  const addDocument = async (docData: Omit<Attachment, 'id'>): Promise<void> => {
    const newDoc: Attachment = {
      ...docData,
      id: createEntityId('doc-'),
    };
    await runOrdinaryWrite(
      () => saveDocumentToIDB(newDoc),
      `Document "${newDoc.title}" was not saved`
    );
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(`Document "${newDoc.title}" saved`, 'success');
  };

  const [importHistory, setImportHistory] = useState<ImportBatchRecord[]>([]);

  const addImportBatch = (data: {
    batchId: string;
    filename: string;
    records: ServiceRecord[];
    issues: ActiveIssue[];
    maintenanceTasks: MaintenancePlan[];
    documents: Attachment[];
  }): ImportBatchRecord => {
    // Generate pre-import backup snapshot
    const backupSnapshot: string = JSON.stringify({
      vehicles,
      records,
      issues,
      maintenanceTasks,
      documents,
    });

    const taggedRecords = data.records.map((r) => ({ ...r, importBatchId: data.batchId }));
    const taggedIssues = data.issues.map((i) => ({ ...i, importBatchId: data.batchId }));
    const taggedTasks = data.maintenanceTasks.map((t) => ({ ...t, importBatchId: data.batchId }));
    const taggedDocs = data.documents.map((d) => ({ ...d, importBatchId: data.batchId }));

    setRecords((prev) => [...taggedRecords, ...prev]);
    setIssues((prev) => [...taggedIssues, ...prev]);
    setMaintenanceTasks((prev) => [...taggedTasks, ...prev]);
    setDocuments((prev) => [...taggedDocs, ...prev]);

    // Persist to IDB
    taggedRecords.forEach((r) => saveRecordToIDB(r));
    taggedIssues.forEach((i) => saveIssueToIDB(i));
    taggedTasks.forEach((t) => saveTaskToIDB(t));
    taggedDocs.forEach((d) => saveDocumentToIDB(d));

    const batchRecord: ImportBatchRecord = {
      id: data.batchId,
      timestamp: new Date().toISOString(),
      filename: data.filename,
      recordsAdded: taggedRecords.length,
      recordsUpdated: 0,
      recordsSkipped: 0,
      issuesAdded: taggedIssues.length,
      plansAdded: taggedTasks.length,
      documentsAdded: taggedDocs.length,
      snapshotBackup: backupSnapshot,
    };

    setImportHistory((prev) => [batchRecord, ...prev]);
    showToast(`Import batch "${data.batchId}" committed (${taggedRecords.length} records added)`, 'success');

    return batchRecord;
  };

  const rollbackImportBatch = (batchId: string) => {
    const batch = importHistory.find((b) => b.id === batchId);
    if (batch && batch.snapshotBackup) {
      try {
        const restored = JSON.parse(batch.snapshotBackup);
        setVehicles(restored.vehicles || []);
        setRecords(restored.records || []);
        setIssues(restored.issues || []);
        setMaintenanceTasks(restored.maintenanceTasks || []);
        setDocuments(restored.documents || []);

        void replaceAllStoresAtomically(restored).catch((error) => {
          const message =
            error instanceof Error ? error.message : 'Unknown rollback persistence error.';
          showToast(`Rollback persistence failed: ${message}`, 'error');
        });
        setImportHistory((prev) => prev.filter((b) => b.id !== batchId));
        showToast(`Rolled back import batch ${batchId}`, 'info');
        return;
      } catch (err) {
        console.error('Failed to parse snapshot backup for rollback:', err);
      }
    }

    // Fallback filter by importBatchId
    setRecords((prev) => prev.filter((r) => r.importBatchId !== batchId));
    setIssues((prev) => prev.filter((i) => i.importBatchId !== batchId));
    setMaintenanceTasks((prev) => prev.filter((t) => t.importBatchId !== batchId));
    setDocuments((prev) => prev.filter((d) => d.importBatchId !== batchId));
    setImportHistory((prev) => prev.filter((b) => b.id !== batchId));

    showToast(`Rolled back import batch ${batchId}`, 'info');
  };

  const exportFullBackup = async (): Promise<BackupArtifact> => {
    if (isLoading) {
      throw new Error('Application data is still loading.');
    }
    if (initializationError) {
      throw new Error('Local database is unavailable.');
    }
    if (exportLockRef.current) {
      throw new Error('A backup export is already in progress.');
    }
    if (destructiveDataLockRef.current) {
      throw new Error('A demo or reset operation is in progress.');
    }

    exportLockRef.current = true;
    setIsExportingBackup(true);
    try {
      await waitForPendingWrites();
      const snapshot = await readIndexedDBSnapshot();
      return await createBackupArtifact(
        snapshot,
        {
          theme,
          activeVehicleId: activeVehicleId || null,
          unitSystem,
          currencySymbol,
        },
        importHistory
      );
    } finally {
      exportLockRef.current = false;
      setIsExportingBackup(false);
    }
  };

  const restoreFullBackupFromOnboarding = async (
    validated: ValidatedFullBackup
  ): Promise<void> => {
    if (isLoading) throw new Error('Application data is still loading.');
    if (initializationError) throw new Error('Local database is unavailable.');
    if (vehicles.length !== 0) {
      throw new Error('Onboarding restore is available only for an empty garage.');
    }
    if (
      exportLockRef.current ||
      fullRestoreLockRef.current ||
      destructiveDataLockRef.current ||
      pendingWriteGateRef.current.count > 0
    ) {
      throw new Error('Another data operation is already in progress.');
    }

    fullRestoreLockRef.current = true;
    setIsFullBackupRestoreInProgress(true);
    try {
      await persistRestoreThenApply(
        validated,
        ({ backup, snapshot }, restoredActiveVehicleId) => {
          localStorage.setItem('autolog_active_vehicle', restoredActiveVehicleId);
          localStorage.setItem('autolog_theme', backup.data.preferences.theme);
          setThemeState(backup.data.preferences.theme);
          setUnitSystemState(backup.data.preferences.unitSystem);
          setCurrencySymbolState(backup.data.preferences.currencySymbol);
          setImportHistory(backup.data.importHistory);
          setActiveVehicleIdState(restoredActiveVehicleId);
          setRecords(snapshot.records);
          setIssues(snapshot.issues);
          setMaintenanceTasks(snapshot.maintenanceTasks);
          setDocuments(snapshot.documents);
          setVehicles(snapshot.vehicles);
        }
      );
    } finally {
      fullRestoreLockRef.current = false;
      setIsFullBackupRestoreInProgress(false);
    }
  };

  const hasRecognizedDemoData = containsRecognizedDemoManifest({
    vehicles,
    records,
    issues,
    maintenanceTasks,
    documents,
  });

  const assertDemoOrResetCanStart = () => {
    if (
      isLoading ||
      initializationError ||
      exportLockRef.current ||
      fullRestoreLockRef.current ||
      destructiveDataLockRef.current ||
      pendingWriteGateRef.current.count > 0
    ) {
      throw new Error('Another data operation is active or the database is unavailable.');
    }
  };

  const loadDemoDataFromOnboarding = async (): Promise<void> => {
    assertDemoOrResetCanStart();
    if (vehicles.length !== 0) {
      throw new Error('Demo data can be loaded only from an empty onboarding garage.');
    }
    destructiveDataLockRef.current = true;
    setIsDestructiveDataOperationInProgress(true);
    try {
      await persistThenCommit(loadDemoDataIntoEmptyIDB, () => {
        const restored = structuredClone(DEMO_DATA);
        localStorage.setItem('autolog_active_vehicle', DEMO_VEHICLE_ID);
        setActiveVehicleIdState(DEMO_VEHICLE_ID);
        setRecords(restored.records);
        setIssues(restored.issues);
        setMaintenanceTasks(restored.maintenanceTasks);
        setDocuments(restored.documents);
        setVehicles(restored.vehicles);
      });
    } finally {
      destructiveDataLockRef.current = false;
      setIsDestructiveDataOperationInProgress(false);
    }
  };

  const removeDemoData = async (): Promise<void> => {
    assertDemoOrResetCanStart();
    if (!hasRecognizedDemoData) {
      throw new Error('The exact recognized demo dataset is not present.');
    }
    destructiveDataLockRef.current = true;
    setIsDestructiveDataOperationInProgress(true);
    try {
      await removeExactDemoDataFromIDB();
      const withoutIds = <T extends { id: string }>(
        items: T[],
        ids: readonly string[]
      ) => items.filter((item) => !ids.includes(item.id));
      const remainingVehicles = withoutIds(vehicles, DEMO_ID_MANIFEST.vehicles);
      setRecords(withoutIds(records, DEMO_ID_MANIFEST.records));
      setIssues(withoutIds(issues, DEMO_ID_MANIFEST.issues));
      setMaintenanceTasks(
        withoutIds(maintenanceTasks, DEMO_ID_MANIFEST.maintenanceTasks)
      );
      setDocuments(withoutIds(documents, DEMO_ID_MANIFEST.documents));
      setVehicles(remainingVehicles);
      if (activeVehicleId === DEMO_VEHICLE_ID) {
        localStorage.removeItem('autolog_active_vehicle');
        setActiveVehicleIdState(remainingVehicles[0]?.id || null);
      }
    } finally {
      destructiveDataLockRef.current = false;
      setIsDestructiveDataOperationInProgress(false);
    }
  };

  const resetAllLocalData = async (): Promise<void> => {
    assertDemoOrResetCanStart();
    destructiveDataLockRef.current = true;
    setIsDestructiveDataOperationInProgress(true);
    try {
      await persistThenCommit(clearAllIndexedDB, () => {
        localStorage.removeItem('autolog_active_vehicle');
        setActiveVehicleIdState(null);
        setVehicles([]);
        setRecords([]);
        setIssues([]);
        setMaintenanceTasks([]);
        setDocuments([]);
        setImportHistory([]);
      });
    } finally {
      destructiveDataLockRef.current = false;
      setIsDestructiveDataOperationInProgress(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        isLoading,
        initializationError,
        pendingWriteCount,
        vehicles,
        activeVehicleId,
        activeVehicle,
        records,
        issues,
        maintenanceTasks,
        documents,
        theme,
        resolvedTheme,
        setTheme: setThemeState,
        currentScreen,
        unitSystem,
        currencySymbol,
        toast,
        isExportingBackup,
        isFullBackupRestoreInProgress,
        isDestructiveDataOperationInProgress,
        hasRecognizedDemoData,
        setActiveVehicleId,
        setCurrentScreen,
        toggleTheme,
        setUnitSystem: setUnitSystemState,
        setCurrencySymbol: setCurrencySymbolState,
        addRecord,
        updateRecord,
        deleteRecord,
        addIssue,
        updateIssue,
        resolveIssue,
        deleteIssue,
        addVehicle,
        updateVehicle,
        updateVehicleMileage,
        addMaintenanceTask,
        updateMaintenanceTask,
        deleteMaintenanceTask,
        addDocument,
        importHistory,
        addImportBatch,
        rollbackImportBatch,
        exportFullBackup,
        restoreFullBackupFromOnboarding,
        loadDemoDataFromOnboarding,
        removeDemoData,
        resetAllLocalData,
        showToast,
        checkDuplicateInvoiceNumber,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
