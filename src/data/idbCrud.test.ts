import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TEST_DOCUMENTS,
  TEST_ISSUES,
  TEST_MAINTENANCE_TASKS,
  TEST_RECORDS,
  TEST_VEHICLES,
} from '../test/fixtures';
import {
  deleteRecordFromIDB,
  initIndexedDB,
  saveRecordToIDB,
} from './idb';

function createManualCrudDatabase() {
  const request = {
    error: null as DOMException | null,
    onerror: null,
  };
  const transaction = {
    error: null as DOMException | null,
    oncomplete: null,
    onerror: null,
    onabort: null,
    objectStore: () => ({
      put: () => request,
      delete: () => request,
    }),
  };
  const database = {
    close: vi.fn(),
    transaction: vi.fn(() => transaction),
  };
  const openRequest = {
    result: database,
    error: null,
    onupgradeneeded: null,
    onsuccess: null,
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
    transaction: transaction as unknown as IDBTransaction,
    request: request as unknown as IDBRequest,
    requestControl: request,
  };
}

function createFirstRunDatabase(
  initialStores: Partial<Record<string, unknown[]>> = {}
) {
  const stores: Record<string, unknown[]> = {
    vehicles: [],
    records: [],
    issues: [],
    maintenanceTasks: [],
    documents: [],
    ...structuredClone(initialStores),
  };
  const put = vi.fn((storeName: string, item: unknown) => {
    const request = { error: null, onerror: null };
    queueMicrotask(() => {
      stores[storeName].push(structuredClone(item));
    });
    return request;
  });
  const database = {
    close: vi.fn(),
    transaction: vi.fn((storeName: string, mode: IDBTransactionMode) => {
      const transaction = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore: () => ({
          getAll: () => {
            const request = {
              result: structuredClone(stores[storeName]),
              error: null,
              onerror: null,
            };
            queueMicrotask(() => transaction.oncomplete?.(new Event('complete')));
            return request;
          },
          put: (item: unknown) => put(storeName, item),
        }),
      };
      expect(mode).toMatch(/readonly|readwrite/);
      return transaction;
    }),
  };
  const openRequest = {
    result: database,
    error: null,
    onupgradeneeded: null,
    onsuccess: null,
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
    put,
    stores,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ordinary IndexedDB CRUD durability', () => {
  it('resolves add/update only after transaction completion', async () => {
    const fake = createManualCrudDatabase();
    vi.stubGlobal('indexedDB', fake.factory);
    let resolved = false;
    const promise = saveRecordToIDB(TEST_RECORDS[0]).then(() => {
      resolved = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    fake.request.onsuccess?.(new Event('success'));
    await Promise.resolve();
    expect(resolved).toBe(false);

    fake.transaction.oncomplete?.(new Event('complete'));
    await expect(promise).resolves.toBeUndefined();
    expect(fake.database.close).toHaveBeenCalledOnce();
  });

  it('resolves delete only after transaction completion', async () => {
    const fake = createManualCrudDatabase();
    vi.stubGlobal('indexedDB', fake.factory);
    let resolved = false;
    const promise = deleteRecordFromIDB('rec-test').then(() => {
      resolved = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBe(false);
    fake.transaction.oncomplete?.(new Event('complete'));
    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects request failures and transaction aborts without swallowing errors', async () => {
    const requestFailure = createManualCrudDatabase();
    vi.stubGlobal('indexedDB', requestFailure.factory);
    const failedWrite = saveRecordToIDB(TEST_RECORDS[0]);
    await Promise.resolve();
    await Promise.resolve();
    requestFailure.requestControl.error = new DOMException('Injected request failure');
    requestFailure.request.onerror?.(new Event('error'));
    await expect(failedWrite).rejects.toThrow('Injected request failure');

    const aborted = createManualCrudDatabase();
    vi.stubGlobal('indexedDB', aborted.factory);
    const abortedWrite = saveRecordToIDB(TEST_RECORDS[0]);
    await Promise.resolve();
    await Promise.resolve();
    aborted.transaction.onabort?.(new Event('abort'));
    await expect(abortedWrite).rejects.toThrow('Writing records was aborted');
  });
});

describe('IndexedDB initialization failure behavior', () => {
  it('surfaces an existing database open failure instead of returning samples', async () => {
    const request = {
      error: new DOMException('Existing database unavailable'),
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    };
    vi.stubGlobal('indexedDB', {
      open: () => {
        queueMicrotask(() => request.onerror?.(new Event('error')));
        return request;
      },
    });

    await expect(initIndexedDB()).rejects.toThrow('Existing database unavailable');
  });

  it('surfaces an existing database read failure instead of returning samples', async () => {
    const database = {
      close: vi.fn(),
      transaction: () => {
        const transaction = {
          error: null,
          oncomplete: null,
          onerror: null,
          onabort: null,
          objectStore: () => ({
            getAll: () => {
              const request = {
                result: [],
                error: new DOMException('Existing database read failed'),
                onerror: null,
              };
              queueMicrotask(() => {
                request.onerror?.(new Event('error'));
                transaction.onabort?.(new Event('abort'));
              });
              return request;
            },
          }),
        };
        return transaction;
      },
    };
    const openRequest = {
      result: database,
      error: null,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      onblocked: null,
    };
    vi.stubGlobal('indexedDB', {
      open: () => {
        queueMicrotask(() => openRequest.onsuccess?.(new Event('success')));
        return openRequest;
      },
    });

    await expect(initIndexedDB()).rejects.toThrow('Existing database read failed');
  });

  it('keeps a genuine empty first run at 0/0/0/0/0 without seed writes', async () => {
    const fake = createFirstRunDatabase();
    vi.stubGlobal('indexedDB', fake.factory);

    const initialized = await initIndexedDB();

    expect(initialized).toEqual({
      vehicles: [],
      records: [],
      issues: [],
      maintenanceTasks: [],
      documents: [],
    });
    expect(fake.put).not.toHaveBeenCalled();
    expect(fake.database.transaction).toHaveBeenCalledTimes(5);
    expect(fake.database.transaction).not.toHaveBeenCalledWith(
      expect.anything(),
      'readwrite'
    );
  });

  it('does not seed or normalize a partial but valid database', async () => {
    const partial = {
      records: structuredClone(TEST_RECORDS.slice(0, 1)),
    };
    const fake = createFirstRunDatabase(partial);
    vi.stubGlobal('indexedDB', fake.factory);

    const initialized = await initIndexedDB();

    expect(initialized).toEqual({
      vehicles: [],
      records: partial.records,
      issues: [],
      maintenanceTasks: [],
      documents: [],
    });
    expect(fake.put).not.toHaveBeenCalled();
  });

  it('returns an existing non-empty database exactly as stored', async () => {
    const existing = {
      vehicles: structuredClone(TEST_VEHICLES.slice(0, 1)),
      records: structuredClone(TEST_RECORDS.slice(0, 1)),
      issues: structuredClone(TEST_ISSUES.slice(0, 1)),
      maintenanceTasks: structuredClone(TEST_MAINTENANCE_TASKS.slice(0, 1)),
      documents: structuredClone(TEST_DOCUMENTS.slice(0, 1)),
    };
    const fake = createFirstRunDatabase(existing);
    vi.stubGlobal('indexedDB', fake.factory);

    const initialized = await initIndexedDB();

    expect(initialized).toEqual(existing);
    expect(fake.stores).toEqual(existing);
    expect(fake.put).not.toHaveBeenCalled();
  });
});
