import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TEST_DOCUMENTS,
  TEST_ISSUES,
  TEST_MAINTENANCE_TASKS,
  TEST_RECORDS,
  TEST_VEHICLES,
} from '../test/fixtures';
import { APP_VERSION } from '../appMetadata';
import { ImportBatchRecord, ServiceRecord } from '../types';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BackupPreferences,
  canonicalStringify,
  createBackupArtifact,
  createFullBackup,
} from './backup';
import { DBData, readIndexedDBSnapshot } from './idb';

const createSnapshot = (): DBData => ({
  vehicles: structuredClone(TEST_VEHICLES.slice(0, 1)),
  records: structuredClone(TEST_RECORDS.slice(0, 1)),
  issues: structuredClone(TEST_ISSUES.slice(0, 1)),
  maintenanceTasks: structuredClone(TEST_MAINTENANCE_TASKS.slice(0, 1)),
  documents: structuredClone(TEST_DOCUMENTS.slice(0, 1)),
});

const preferences: BackupPreferences = {
  theme: 'system',
  activeVehicleId: TEST_VEHICLES[0].id,
  unitSystem: 'miles',
  currencySymbol: '$',
};

const importBatch: ImportBatchRecord = {
  id: 'import-test-1',
  timestamp: '2026-07-27T12:00:00.000Z',
  filename: 'test.xlsx',
  recordsAdded: 1,
  recordsUpdated: 0,
  recordsSkipped: 0,
  issuesAdded: 0,
  plansAdded: 0,
  documentsAdded: 0,
  snapshotBackup: '{}',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('full JSON backup generation', () => {
  it('maps all five IndexedDB stores to the public backup fields', async () => {
    const snapshot = createSnapshot();
    const backup = await createFullBackup(snapshot, preferences, [importBatch], {
      exportedAt: '2026-07-27T12:34:56.000Z',
    });

    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(backup.appVersion).toBe('1.0.0');
    expect(backup.appVersion).toBe(APP_VERSION);
    expect(backup.database).toEqual({ name: 'AutoLogDB', version: 1 });
    expect(backup.data.vehicles).toEqual(snapshot.vehicles);
    expect(backup.data.serviceRecords).toEqual(snapshot.records);
    expect(backup.data.activeIssues).toEqual(snapshot.issues);
    expect(backup.data.maintenancePlans).toEqual(snapshot.maintenanceTasks);
    expect(backup.data.documents).toEqual(snapshot.documents);
    expect(backup.data.preferences).toEqual(preferences);
    expect(backup.data.importHistory).toEqual([importBatch]);
  });

  it('calculates counts from the final payload and declares metadata-only documents', async () => {
    const backup = await createFullBackup(createSnapshot(), preferences, [importBatch]);

    expect(backup.validation.counts).toEqual({
      vehicles: backup.data.vehicles.length,
      serviceRecords: backup.data.serviceRecords.length,
      activeIssues: backup.data.activeIssues.length,
      maintenancePlans: backup.data.maintenancePlans.length,
      documents: backup.data.documents.length,
      importHistory: backup.data.importHistory.length,
    });
    expect(backup.validation.includesDocumentFiles).toBe(false);
    expect(backup.validation.importHistoryPersistence).toBe('session-only');
  });

  it('produces a deterministic SHA-256 checksum over canonical data', async () => {
    const snapshot = createSnapshot();
    const first = await createFullBackup(snapshot, preferences, [importBatch], {
      exportedAt: '2026-07-27T12:00:00.000Z',
    });
    const second = await createFullBackup(snapshot, preferences, [importBatch], {
      exportedAt: '2026-07-28T12:00:00.000Z',
    });

    expect(first.validation.checksumAlgorithm).toBe('SHA-256');
    expect(first.validation.payloadChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(first.validation.payloadChecksum).toBe(second.validation.payloadChecksum);
    expect(canonicalStringify({ b: 2, a: 1 })).toBe(
      canonicalStringify({ a: 1, b: 2 })
    );
  });

  it('omits optional undefined properties, preserves zero, and does not mutate sources', async () => {
    const snapshot = createSnapshot();
    const sourceRecord: ServiceRecord = {
      ...snapshot.records[0],
      mileageIn: undefined,
      totalCost: 0,
    };
    snapshot.records = [sourceRecord];
    const sourceBefore = structuredClone(snapshot);
    const preferencesBefore = structuredClone(preferences);
    const importHistoryBefore = structuredClone([importBatch]);

    const backup = await createFullBackup(snapshot, preferences, [importBatch]);

    expect(Object.hasOwn(backup.data.serviceRecords[0], 'mileageIn')).toBe(false);
    expect(backup.data.serviceRecords[0].totalCost).toBe(0);
    expect(Object.hasOwn(sourceRecord, 'mileageIn')).toBe(true);
    expect(sourceRecord.mileageIn).toBeUndefined();
    expect(snapshot).toEqual(sourceBefore);
    expect(preferences).toEqual(preferencesBefore);
    expect([importBatch]).toEqual(importHistoryBefore);
  });

  it('rejects non-finite numbers and other non-JSON-safe values', async () => {
    const nonFiniteSnapshot = createSnapshot();
    nonFiniteSnapshot.records[0].laborCost = Number.NaN;

    await expect(
      createFullBackup(nonFiniteSnapshot, preferences, [])
    ).rejects.toThrow('Non-finite number');

    const unsafeSnapshot = createSnapshot();
    unsafeSnapshot.records[0] = {
      ...unsafeSnapshot.records[0],
      notes: new Map<string, string>(),
    } as unknown as ServiceRecord;

    await expect(createFullBackup(unsafeSnapshot, preferences, [])).rejects.toThrow(
      'Non-JSON-safe object'
    );
  });

  it('rejects empty and duplicate IDs within a collection', async () => {
    const duplicateSnapshot = createSnapshot();
    duplicateSnapshot.records = [
      duplicateSnapshot.records[0],
      structuredClone(duplicateSnapshot.records[0]),
    ];

    await expect(createFullBackup(duplicateSnapshot, preferences, [])).rejects.toThrow(
      'Duplicate ID'
    );

    const invalidIdSnapshot = createSnapshot();
    invalidIdSnapshot.vehicles[0].id = '   ';

    await expect(createFullBackup(invalidIdSnapshot, preferences, [])).rejects.toThrow(
      'Invalid ID'
    );
  });

  it('exports empty collections correctly', async () => {
    const emptySnapshot: DBData = {
      vehicles: [],
      records: [],
      issues: [],
      maintenanceTasks: [],
      documents: [],
    };
    const backup = await createFullBackup(emptySnapshot, preferences, []);

    expect(backup.validation.counts).toEqual({
      vehicles: 0,
      serviceRecords: 0,
      activeIssues: 0,
      maintenancePlans: 0,
      documents: 0,
      importHistory: 0,
    });
    expect(backup.validation.payloadChecksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('creates the expected timestamped JSON artifact', async () => {
    const artifact = await createBackupArtifact(createSnapshot(), preferences, [], {
      exportedAt: '2026-07-27T12:34:56.000Z',
      appVersion: '1.2.3',
    });

    expect(artifact.filename).toBe('autolog-backup-2026-07-27-123456.json');
    expect(artifact.backup.appVersion).toBe('1.2.3');
    expect(JSON.parse(artifact.json)).toEqual(artifact.backup);
  });

  it('serializes the default application version into the JSON artifact', async () => {
    const artifact = await createBackupArtifact(createSnapshot(), preferences, [], {
      exportedAt: '2026-07-27T12:34:56.000Z',
    });

    expect(artifact.backup.appVersion).toBe('1.0.0');
    expect(JSON.parse(artifact.json).appVersion).toBe('1.0.0');
  });
});

describe('IndexedDB backup snapshot failures', () => {
  it('reads all stores in one readonly transaction and resolves only on completion', async () => {
    const expected = createSnapshot();
    const results: Record<string, unknown[]> = {
      vehicles: expected.vehicles,
      records: expected.records,
      issues: expected.issues,
      maintenanceTasks: expected.maintenanceTasks,
      documents: expected.documents,
    };
    const requests = Object.fromEntries(
      Object.entries(results).map(([storeName, result]) => [
        storeName,
        { result, error: null, onerror: null },
      ])
    ) as Record<string, IDBRequest<unknown[]>>;
    const transaction = {
      error: null,
      oncomplete: null,
      onerror: null,
      onabort: null,
      objectStore: vi.fn((storeName: string) => ({
        getAll: () => requests[storeName],
      })),
    } as unknown as IDBTransaction;
    const close = vi.fn();
    const database = {
      version: 1,
      objectStoreNames: {
        contains: (storeName: string) => storeName in results,
      },
      transaction: vi.fn(() => transaction),
      close,
    } as unknown as IDBDatabase;
    const openRequest = {
      result: database,
      error: null,
      transaction: null,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    } as unknown as IDBOpenDBRequest;
    const fakeIndexedDB = {
      open: vi.fn(() => {
        queueMicrotask(() => openRequest.onsuccess?.(new Event('success')));
        return openRequest;
      }),
    } as unknown as IDBFactory;
    vi.stubGlobal('indexedDB', fakeIndexedDB);

    let resolved = false;
    const snapshotPromise = readIndexedDBSnapshot().then((snapshot) => {
      resolved = true;
      return snapshot;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(resolved).toBe(false);
    expect(database.transaction).toHaveBeenCalledWith(
      ['vehicles', 'records', 'issues', 'maintenanceTasks', 'documents'],
      'readonly'
    );

    transaction.oncomplete?.(new Event('complete'));

    await expect(snapshotPromise).resolves.toEqual(expected);
    expect(close).toHaveBeenCalledOnce();
  });

  it('rejects an IndexedDB read failure without returning sample fallback data', async () => {
    const request = {
      error: new DOMException('Read failed'),
    } as unknown as IDBOpenDBRequest;
    const fakeIndexedDB = {
      open: vi.fn(() => {
        queueMicrotask(() => request.onerror?.(new Event('error')));
        return request;
      }),
    } as unknown as IDBFactory;
    vi.stubGlobal('indexedDB', fakeIndexedDB);

    await expect(readIndexedDBSnapshot()).rejects.toThrow('Read failed');
  });
});
