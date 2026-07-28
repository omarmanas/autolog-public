import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFullBackup } from './backup';
import {
  containsRecognizedDemoManifest,
  DEMO_DATA,
  DEMO_ID_MANIFEST,
  DEMO_VEHICLE_ID,
  isExpectedDemoEntity,
} from './demoData';
import {
  clearAllIndexedDB,
  loadDemoDataIntoEmptyIDB,
  removeExactDemoDataFromIDB,
} from './idb';
import { validateFullBackup } from './fullBackupRestore';
import { persistThenCommit } from '../context/persistenceGuards';

const STORE_NAMES = [
  'vehicles',
  'records',
  'issues',
  'maintenanceTasks',
  'documents',
] as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sanitized deterministic demo data', () => {
  it('contains the exact small fictional dataset with explicit demo markers', () => {
    expect(DEMO_DATA.vehicles).toHaveLength(1);
    expect(DEMO_DATA.records).toHaveLength(3);
    expect(DEMO_DATA.issues).toHaveLength(2);
    expect(DEMO_DATA.maintenanceTasks).toHaveLength(2);
    expect(DEMO_DATA.documents).toHaveLength(1);

    const serialized = JSON.stringify(DEMO_DATA).toLowerCase();
    expect(serialized).toContain('demo-not-a-real-vin');
    expect(serialized).toContain('demo-only');
    expect(serialized).toContain('fictional');
  });

  it('has unique deterministic IDs, exact manifest coverage, and valid relationships', () => {
    STORE_NAMES.forEach((storeName) => {
      const ids = DEMO_DATA[storeName].map(({ id }) => id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toEqual([...DEMO_ID_MANIFEST[storeName]]);
      DEMO_DATA[storeName].forEach((entity) => {
        expect(entity.isSampleData).toBe(true);
        expect(isExpectedDemoEntity(storeName, entity)).toBe(true);
      });
    });
    [
      ...DEMO_DATA.records,
      ...DEMO_DATA.issues,
      ...DEMO_DATA.maintenanceTasks,
      ...DEMO_DATA.documents,
    ].forEach((entity) => expect(entity.vehicleId).toBe(DEMO_VEHICLE_ID));
    expect(containsRecognizedDemoManifest(structuredClone(DEMO_DATA))).toBe(true);
  });

  it('is structurally valid under the full-backup runtime validator', async () => {
    const backup = await createFullBackup(
      structuredClone(DEMO_DATA),
      {
        theme: 'system',
        activeVehicleId: DEMO_VEHICLE_ID,
        unitSystem: 'miles',
        currencySymbol: '$',
      },
      []
    );

    await expect(validateFullBackup(backup)).resolves.toBeDefined();
  });
});

function createAtomicDatabase(
  initial: Partial<Record<(typeof STORE_NAMES)[number], unknown[]>> = {},
  failure?: { store: string; operation: 'clear' | 'put' | 'delete' }
) {
  const stores = Object.fromEntries(
    STORE_NAMES.map((name) => [name, structuredClone(initial[name] || [])])
  ) as Record<string, unknown[]>;
  let completed = 0;
  const database = {
    version: 1,
    close: vi.fn(),
    objectStoreNames: { contains: (name: string) => STORE_NAMES.includes(name as never) },
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
        objectStore: (storeName: string) => {
          const makeRequest = (
            operation: () => void,
            operationName: 'getAll' | 'clear' | 'put' | 'delete'
          ) => {
            const request = {
              result: undefined as unknown,
              error: null as DOMException | null,
              onsuccess: null as ((event: Event) => void) | null,
              onerror: null as ((event: Event) => void) | null,
            };
            pending += 1;
            queueMicrotask(() => {
              if (aborted) return;
              if (
                failure?.store === storeName &&
                failure.operation === operationName
              ) {
                request.error = new DOMException(
                  `Injected ${storeName} ${operationName} failure`
                );
                request.onerror?.(new Event('error'));
                pending -= 1;
                return;
              }
              operation();
              request.onsuccess?.(new Event('success'));
              pending -= 1;
              if (pending === 0 && !aborted) {
                queueMicrotask(() => {
                  if (pending || aborted) return;
                  Object.assign(stores, structuredClone(working));
                  completed += 1;
                  transaction.oncomplete?.(new Event('complete'));
                });
              }
            });
            return request;
          };
          return {
            getAll: () => {
              const request = makeRequest(() => undefined, 'getAll');
              request.result = structuredClone(working[storeName]);
              return request;
            },
            clear: () =>
              makeRequest(() => {
                working[storeName] = [];
              }, 'clear'),
            put: (entity: { id: string }) =>
              makeRequest(() => {
                working[storeName].push(structuredClone(entity));
              }, 'put'),
            delete: (id: string) =>
              makeRequest(() => {
                working[storeName] = working[storeName].filter(
                  (entity) => (entity as { id: string }).id !== id
                );
              }, 'delete'),
          };
        },
      };
      expect(names).toEqual([...STORE_NAMES]);
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
    get completed() {
      return completed;
    },
  };
}

describe('atomic demo load', () => {
  it('does not apply the active vehicle or React transition before persistence', async () => {
    let finishPersistence!: () => void;
    const pending = new Promise<void>((resolve) => {
      finishPersistence = resolve;
    });
    const commit = vi.fn();
    const operation = persistThenCommit(() => pending, commit);

    await Promise.resolve();
    expect(commit).not.toHaveBeenCalled();
    finishPersistence();
    await operation;
    expect(commit).toHaveBeenCalledOnce();
  });

  it('writes all stores in one transaction only after confirming they are empty', async () => {
    const fake = createAtomicDatabase();
    vi.stubGlobal('indexedDB', fake.factory);

    await loadDemoDataIntoEmptyIDB();

    expect(fake.database.transaction).toHaveBeenCalledOnce();
    expect(fake.completed).toBe(1);
    expect(fake.stores).toEqual(structuredClone(DEMO_DATA));
  });

  it('does not write to a stale non-empty database', async () => {
    const existing = { id: 'unrelated-record' };
    const fake = createAtomicDatabase({ records: [existing] });
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(loadDemoDataIntoEmptyIDB()).rejects.toThrow('no longer empty');
    expect(fake.stores.records).toEqual([existing]);
    expect(fake.stores.vehicles).toEqual([]);
  });

  it('aborts all demo writes when one request fails', async () => {
    const fake = createAtomicDatabase({}, { store: 'issues', operation: 'put' });
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(loadDemoDataIntoEmptyIDB()).rejects.toThrow('Injected issues');
    Object.values(fake.stores).forEach((items) => expect(items).toEqual([]));
    expect(fake.completed).toBe(0);
  });
});

describe('exact atomic demo removal', () => {
  it('removes only manifest IDs and leaves unrelated entities untouched', async () => {
    const unrelated = { id: 'unrelated-vehicle', make: 'Keep' };
    const initial = structuredClone(DEMO_DATA);
    initial.vehicles.push(unrelated as never);
    const fake = createAtomicDatabase(initial);
    vi.stubGlobal('indexedDB', fake.factory);

    await removeExactDemoDataFromIDB();

    expect(fake.stores.vehicles).toEqual([unrelated]);
    expect(fake.stores.records).toEqual([]);
    expect(fake.database.transaction).toHaveBeenCalledOnce();
  });

  it('aborts when a deterministic demo ID belongs to unexpected data', async () => {
    const initial = structuredClone(DEMO_DATA);
    initial.records[0].workPerformed = 'Unexpected collision';
    const fake = createAtomicDatabase(initial);
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(removeExactDemoDataFromIDB()).rejects.toThrow(
      'differs from the recognized demo entity'
    );
    expect(fake.stores).toEqual(initial);
  });

  it('aborts every deletion when one store request fails', async () => {
    const initial = structuredClone(DEMO_DATA);
    const fake = createAtomicDatabase(initial, {
      store: 'documents',
      operation: 'delete',
    });
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(removeExactDemoDataFromIDB()).rejects.toThrow(
      'Injected documents'
    );
    expect(fake.stores).toEqual(initial);
  });
});

describe('atomic reset to empty', () => {
  it('clears all five stores in one transaction without reseeding', async () => {
    const fake = createAtomicDatabase(structuredClone(DEMO_DATA));
    vi.stubGlobal('indexedDB', fake.factory);

    await clearAllIndexedDB();

    expect(fake.database.transaction).toHaveBeenCalledOnce();
    Object.values(fake.stores).forEach((items) => expect(items).toEqual([]));
  });

  it('rolls back every clear when one store fails', async () => {
    const initial = structuredClone(DEMO_DATA);
    const fake = createAtomicDatabase(initial, {
      store: 'issues',
      operation: 'clear',
    });
    vi.stubGlobal('indexedDB', fake.factory);

    await expect(clearAllIndexedDB()).rejects.toThrow('Injected issues');
    expect(fake.stores).toEqual(initial);
  });
});
