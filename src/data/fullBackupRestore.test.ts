import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TEST_DOCUMENTS,
  TEST_ISSUES,
  TEST_MAINTENANCE_TASKS,
  TEST_RECORDS,
  TEST_VEHICLES,
} from '../test/fixtures';
import {
  calculateBackupPayloadChecksum,
  createFullBackup,
  FullBackup,
} from './backup';
import {
  parseFullBackupJson,
  persistRestoreThenApply,
  restoreValidatedFullBackup,
  selectRestoredActiveVehicleId,
  validateFullBackup,
} from './fullBackupRestore';
import { DBData } from './idb';

const createSnapshot = (): DBData => ({
  vehicles: structuredClone(TEST_VEHICLES.slice(0, 1)),
  records: structuredClone(TEST_RECORDS.slice(0, 1)),
  issues: structuredClone(TEST_ISSUES.slice(0, 1)),
  maintenanceTasks: structuredClone(TEST_MAINTENANCE_TASKS.slice(0, 1)),
  documents: structuredClone(TEST_DOCUMENTS.slice(0, 1)),
});

async function createBackup(appVersion = 'informational-version'): Promise<FullBackup> {
  const snapshot = createSnapshot();
  return createFullBackup(
    snapshot,
    {
      theme: 'dark',
      activeVehicleId: snapshot.vehicles[0].id,
      unitSystem: 'miles',
      currencySymbol: '$',
    },
    [],
    { appVersion, exportedAt: '2026-07-28T12:00:00.000Z' }
  );
}

async function resign(backup: FullBackup): Promise<void> {
  backup.validation.payloadChecksum = await calculateBackupPayloadChecksum(backup.data);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('full backup restore validation', () => {
  it('accepts a valid full backup, valid zero values, and informational app versions', async () => {
    const backup = await createBackup('99.0-experimental');
    backup.data.serviceRecords[0].laborCost = 0;
    backup.data.serviceRecords[0].totalCost = 0;
    await resign(backup);

    const validated = await validateFullBackup(backup);

    expect(validated.backup.appVersion).toBe('99.0-experimental');
    expect(validated.snapshot.records[0].laborCost).toBe(0);
  });

  it('does not mutate the source backup while validating it', async () => {
    const backup = await createBackup();
    const before = structuredClone(backup);

    await validateFullBackup(backup);

    expect(backup).toEqual(before);
  });

  it('rejects malformed JSON and wrong format/version values', async () => {
    await expect(parseFullBackupJson('{bad json')).rejects.toThrow('not valid JSON');

    const wrongFormat = await createBackup();
    (wrongFormat as unknown as { format: string }).format = 'not-autolog';
    await expect(validateFullBackup(wrongFormat)).rejects.toThrow('format must be');

    const wrongVersion = await createBackup();
    (wrongVersion as unknown as { formatVersion: number }).formatVersion = 2;
    await expect(validateFullBackup(wrongVersion)).rejects.toThrow('formatVersion');
  });

  it('rejects checksum and count mismatches', async () => {
    const checksum = await createBackup();
    checksum.validation.payloadChecksum = '0'.repeat(64);
    await expect(validateFullBackup(checksum)).rejects.toThrow('checksum does not match');

    const count = await createBackup();
    count.validation.counts.serviceRecords += 1;
    await expect(validateFullBackup(count)).rejects.toThrow(
      'counts.serviceRecords does not match'
    );
  });

  it('rejects duplicate vehicle and entity IDs', async () => {
    const duplicateVehicle = await createBackup();
    duplicateVehicle.data.vehicles.push(
      structuredClone(duplicateVehicle.data.vehicles[0])
    );
    duplicateVehicle.validation.counts.vehicles += 1;
    await resign(duplicateVehicle);
    await expect(validateFullBackup(duplicateVehicle)).rejects.toThrow(
      'duplicate ID'
    );

    const duplicateRecord = await createBackup();
    duplicateRecord.data.serviceRecords.push(
      structuredClone(duplicateRecord.data.serviceRecords[0])
    );
    duplicateRecord.validation.counts.serviceRecords += 1;
    await resign(duplicateRecord);
    await expect(validateFullBackup(duplicateRecord)).rejects.toThrow(
      'duplicate ID'
    );
  });

  it.each([
    ['serviceRecords', 'record'],
    ['activeIssues', 'issue'],
    ['maintenancePlans', 'plan'],
    ['documents', 'document'],
  ] as const)('rejects an orphaned %s entity', async (collection, _label) => {
    const backup = await createBackup();
    backup.data[collection][0].vehicleId = 'veh-missing';
    await resign(backup);

    await expect(validateFullBackup(backup)).rejects.toThrow(
      'references missing vehicle'
    );
  });

  it('rejects invalid active vehicle preferences and zero-vehicle backups', async () => {
    const invalidActive = await createBackup();
    invalidActive.data.preferences.activeVehicleId = 'veh-missing';
    await resign(invalidActive);
    await expect(validateFullBackup(invalidActive)).rejects.toThrow(
      'activeVehicleId does not reference'
    );

    const empty = await createBackup();
    empty.data.vehicles = [];
    empty.validation.counts.vehicles = 0;
    await resign(empty);
    await expect(validateFullBackup(empty)).rejects.toThrow(
      'requires at least one vehicle'
    );
  });

  it('rejects prototype-pollution keys and programmatic non-finite values', async () => {
    const pollutedJson = JSON.stringify(await createBackup()).replace(
      '"data":{',
      '"data":{"__proto__":{"polluted":true},'
    );
    await expect(parseFullBackupJson(pollutedJson)).rejects.toThrow('forbidden key');

    const nonFinite = await createBackup();
    nonFinite.data.serviceRecords[0].laborCost = Number.NaN;
    await expect(validateFullBackup(nonFinite)).rejects.toThrow('non-finite number');
  });
});

function createAtomicDatabase(
  initial: Partial<Record<string, unknown[]>> = {},
  failStore?: string
) {
  const storeNames = ['vehicles', 'records', 'issues', 'maintenanceTasks', 'documents'];
  const stores = Object.fromEntries(
    storeNames.map((name) => [name, structuredClone(initial[name] || [])])
  ) as Record<string, unknown[]>;
  const transactions: unknown[] = [];
  let completionCount = 0;

  const database = {
    version: 1,
    close: vi.fn(),
    objectStoreNames: { contains: (name: string) => storeNames.includes(name) },
    transaction: vi.fn((names: string[], mode: IDBTransactionMode) => {
      const working = structuredClone(stores);
      let pending = 0;
      let aborted = false;
      const transaction = {
        error: null,
        oncomplete: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onabort: null as ((event: Event) => void) | null,
        abort: vi.fn(() => {
          if (aborted) return;
          aborted = true;
          queueMicrotask(() => transaction.onabort?.(new Event('abort')));
        }),
        objectStore: (name: string) => {
          const request = (operation: () => void, shouldFail = false) => {
            const result = {
              result: undefined as unknown,
              error: null as DOMException | null,
              onsuccess: null as ((event: Event) => void) | null,
              onerror: null as ((event: Event) => void) | null,
            };
            pending += 1;
            queueMicrotask(() => {
              if (aborted) return;
              if (shouldFail) {
                result.error = new DOMException(`Injected ${name} failure`);
                result.onerror?.(new Event('error'));
                pending -= 1;
                return;
              }
              operation();
              result.onsuccess?.(new Event('success'));
              pending -= 1;
              if (pending === 0 && !aborted) {
                queueMicrotask(() => {
                  if (pending !== 0 || aborted) return;
                  Object.assign(stores, structuredClone(working));
                  completionCount += 1;
                  transaction.oncomplete?.(new Event('complete'));
                });
              }
            });
            return result;
          };
          return {
            getAll: () => {
              const result = request(() => undefined);
              result.result = structuredClone(working[name]);
              return result;
            },
            clear: () => request(() => {
              working[name] = [];
            }),
            put: (entity: unknown) =>
              request(
                () => {
                  working[name].push(structuredClone(entity));
                },
                failStore === name
              ),
          };
        },
      };
      transactions.push(transaction);
      expect(names).toEqual(storeNames);
      expect(mode).toBe('readwrite');
      return transaction;
    }),
  };
  const openRequest = {
    result: database,
    error: null,
    onupgradeneeded: null,
    onsuccess: null as ((event: Event) => void) | null,
    onerror: null,
    onblocked: null,
  };
  const factory = {
    open: vi.fn(() => {
      queueMicrotask(() => openRequest.onsuccess?.(new Event('success')));
      return openRequest;
    }),
  };
  return {
    factory: factory as unknown as IDBFactory,
    database,
    stores,
    transactions,
    get completionCount() {
      return completionCount;
    },
  };
}

describe('atomic onboarding restore persistence', () => {
  it('restores all five stores in one transaction and resolves only on completion', async () => {
    const backup = await createBackup();
    const validated = await validateFullBackup(backup);
    const fake = createAtomicDatabase();
    vi.stubGlobal('indexedDB', fake.factory);
    let resolved = false;

    const operation = restoreValidatedFullBackup(validated).then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    await operation;

    expect(fake.database.transaction).toHaveBeenCalledOnce();
    expect(fake.completionCount).toBe(1);
    expect(fake.stores.vehicles).toEqual(validated.snapshot.vehicles);
    expect(fake.stores.records).toEqual(validated.snapshot.records);
    expect(fake.stores.issues).toEqual(validated.snapshot.issues);
    expect(fake.stores.maintenanceTasks).toEqual(
      validated.snapshot.maintenanceTasks
    );
    expect(fake.stores.documents).toEqual(validated.snapshot.documents);
  });

  it('directly rechecks emptiness and performs no writes when any store has data', async () => {
    const validated = await validateFullBackup(await createBackup());
    const existing = { id: 'existing' };
    const fake = createAtomicDatabase({ records: [existing] });
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(restoreValidatedFullBackup(validated)).rejects.toThrow(
      'records" is no longer empty'
    );
    expect(fake.stores.records).toEqual([existing]);
    expect(fake.stores.vehicles).toEqual([]);
  });

  it('aborts every store when one write request fails and does not swallow the error', async () => {
    const validated = await validateFullBackup(await createBackup());
    const fake = createAtomicDatabase({}, 'issues');
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(restoreValidatedFullBackup(validated)).rejects.toThrow(
      'Injected issues failure'
    );
    expect(fake.completionCount).toBe(0);
    Object.values(fake.stores).forEach((entities) => expect(entities).toEqual([]));
  });

  it('applies preferences and state only after persistence completes', async () => {
    const validated = await validateFullBackup(await createBackup());
    let finishPersistence!: () => void;
    const persistence = new Promise<void>((resolve) => {
      finishPersistence = resolve;
    });
    const apply = vi.fn();
    const operation = persistRestoreThenApply(validated, apply, () => persistence);

    await Promise.resolve();
    expect(apply).not.toHaveBeenCalled();
    finishPersistence();
    await operation;
    expect(apply).toHaveBeenCalledWith(
      validated,
      validated.backup.data.preferences.activeVehicleId
    );
  });

  it('falls back to the first restored vehicle when no preference is present', async () => {
    const backup = await createBackup();
    backup.data.preferences.activeVehicleId = null;
    await resign(backup);
    const validated = await validateFullBackup(backup);

    expect(selectRestoredActiveVehicleId(validated)).toBe(
      validated.snapshot.vehicles[0].id
    );
  });
});
