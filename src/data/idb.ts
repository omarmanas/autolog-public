import {
  Vehicle,
  ServiceRecord,
  ActiveIssue,
  MaintenancePlan,
  Attachment,
} from '../types';
import {
  DEMO_DATA,
  DEMO_ID_MANIFEST,
  isExpectedDemoEntity,
} from './demoData';

export const DB_NAME = 'AutoLogDB';
export const DB_VERSION = 1;

const SNAPSHOT_STORE_NAMES = [
  'vehicles',
  'records',
  'issues',
  'maintenanceTasks',
  'documents',
] as const;

export interface DBData {
  vehicles: Vehicle[];
  records: ServiceRecord[];
  issues: ActiveIssue[];
  maintenanceTasks: MaintenancePlan[];
  documents: Attachment[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('vehicles')) {
        db.createObjectStore('vehicles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('records')) {
        db.createObjectStore('records', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('issues')) {
        db.createObjectStore('issues', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('maintenanceTasks')) {
        db.createObjectStore('maintenanceTasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      reject(new Error(`Opening IndexedDB database "${DB_NAME}" was blocked.`));
    };
  });
}

function openExistingDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    let rejectedUpgrade = false;

    request.onupgradeneeded = () => {
      rejectedUpgrade = true;
      request.transaction?.abort();
    };
    request.onsuccess = () => {
      if (rejectedUpgrade) {
        request.result.close();
        reject(new Error(`IndexedDB database "${DB_NAME}" does not exist.`));
        return;
      }
      resolve(request.result);
    };
    request.onerror = () => {
      reject(
        rejectedUpgrade
          ? new Error(`IndexedDB database "${DB_NAME}" does not exist.`)
          : request.error || new Error(`Failed to open IndexedDB database "${DB_NAME}".`)
      );
    };
    request.onblocked = () => {
      reject(new Error(`Opening IndexedDB database "${DB_NAME}" was blocked.`));
    };
  });
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    let requestError: DOMException | null = null;
    req.onerror = () => {
      requestError = req.error || new DOMException(`Failed to read ${storeName}.`);
      reject(requestError);
    };
    tx.oncomplete = () => resolve(req.result as T[]);
    tx.onerror = () =>
      reject(tx.error || requestError || new DOMException(`Failed to read ${storeName}.`));
    tx.onabort = () =>
      reject(tx.error || requestError || new DOMException(`Reading ${storeName} was aborted.`));
  });
}

function putInStore<T>(db: IDBDatabase, storeName: string, item: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    let requestError: DOMException | null = null;
    req.onerror = () => {
      requestError = req.error || new DOMException(`Failed to write ${storeName}.`);
      reject(requestError);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error || requestError || new DOMException(`Failed to write ${storeName}.`));
    tx.onabort = () =>
      reject(tx.error || requestError || new DOMException(`Writing ${storeName} was aborted.`));
  });
}

function deleteFromStore(db: IDBDatabase, storeName: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    let requestError: DOMException | null = null;
    req.onerror = () => {
      requestError = req.error || new DOMException(`Failed to delete ${storeName}/${id}.`);
      reject(requestError);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(
        tx.error ||
          requestError ||
          new DOMException(`Failed to delete ${storeName}/${id}.`)
      );
    tx.onabort = () =>
      reject(
        tx.error ||
          requestError ||
          new DOMException(`Deleting ${storeName}/${id} was aborted.`)
      );
  });
}

export async function readIndexedDBSnapshot(): Promise<DBData> {
  const db = await openExistingDB();

  try {
    if (db.version !== DB_VERSION) {
      throw new Error(
        `IndexedDB version mismatch: expected ${DB_VERSION}, found ${db.version}.`
      );
    }

    for (const storeName of SNAPSHOT_STORE_NAMES) {
      if (!db.objectStoreNames.contains(storeName)) {
        throw new Error(`IndexedDB store "${storeName}" is missing.`);
      }
    }

    return await new Promise<DBData>((resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction = db.transaction([...SNAPSHOT_STORE_NAMES], 'readonly');
      } catch (error) {
        reject(error);
        return;
      }

      const requests = {
        vehicles: transaction.objectStore('vehicles').getAll(),
        records: transaction.objectStore('records').getAll(),
        issues: transaction.objectStore('issues').getAll(),
        maintenanceTasks: transaction.objectStore('maintenanceTasks').getAll(),
        documents: transaction.objectStore('documents').getAll(),
      };
      let requestError: DOMException | null = null;

      Object.values(requests).forEach((request) => {
        request.onerror = () => {
          requestError = request.error || new DOMException('IndexedDB snapshot request failed.');
        };
      });

      transaction.oncomplete = () => {
        resolve({
          vehicles: requests.vehicles.result as Vehicle[],
          records: requests.records.result as ServiceRecord[],
          issues: requests.issues.result as ActiveIssue[],
          maintenanceTasks: requests.maintenanceTasks.result as MaintenancePlan[],
          documents: requests.documents.result as Attachment[],
        });
      };
      transaction.onerror = () => {
        reject(
          transaction.error ||
            requestError ||
            new DOMException('IndexedDB snapshot transaction failed.')
        );
      };
      transaction.onabort = () => {
        reject(
          transaction.error ||
            requestError ||
            new DOMException('IndexedDB snapshot transaction was aborted.')
        );
      };
    });
  } finally {
    db.close();
  }
}

export async function replaceAllStoresAtomically(data: DBData): Promise<void> {
  const db = await openExistingDB();

  try {
    if (db.version !== DB_VERSION) {
      throw new Error(
        `IndexedDB version mismatch: expected ${DB_VERSION}, found ${db.version}.`
      );
    }
    for (const storeName of SNAPSHOT_STORE_NAMES) {
      if (!db.objectStoreNames.contains(storeName)) {
        throw new Error(`IndexedDB store "${storeName}" is missing.`);
      }
    }

    await new Promise<void>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = db.transaction([...SNAPSHOT_STORE_NAMES], 'readwrite');
      } catch (error) {
        reject(error);
        return;
      }

      let operationError: unknown = null;
      const abortWithError = (error: unknown) => {
        if (!operationError) operationError = error;
        try {
          transaction.abort();
        } catch {
          // A failed request may already have started the transaction abort.
        }
      };
      const watchRequest = (request: IDBRequest, description: string) => {
        request.onerror = () => {
          abortWithError(
            request.error || new DOMException(`Atomic store replacement ${description} failed.`)
          );
        };
      };

      const storesAndEntities = [
        ['vehicles', data.vehicles],
        ['records', data.records],
        ['issues', data.issues],
        ['maintenanceTasks', data.maintenanceTasks],
        ['documents', data.documents],
      ] as const;

      try {
        storesAndEntities.forEach(([storeName, entities]) => {
          const store = transaction.objectStore(storeName);
          watchRequest(store.clear(), `clear for ${storeName}`);
          entities.forEach((entity) => {
            watchRequest(
              store.put(entity),
              `write for ${storeName}/${entity.id}`
            );
          });
        });
      } catch (error) {
        abortWithError(error);
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        reject(
          operationError ||
            transaction.error ||
            new DOMException('Atomic store replacement transaction failed.')
        );
      };
      transaction.onabort = () => {
        reject(
          operationError ||
            transaction.error ||
            new DOMException('Atomic store replacement transaction was aborted.')
        );
      };
    });
  } finally {
    db.close();
  }
}

export async function loadDemoDataIntoEmptyIDB(): Promise<void> {
  await restoreFullBackupToEmptyIDB(structuredClone(DEMO_DATA));
}

export async function clearAllIndexedDB(): Promise<void> {
  await replaceAllStoresAtomically({
    vehicles: [],
    records: [],
    issues: [],
    maintenanceTasks: [],
    documents: [],
  });
}

export async function restoreFullBackupToEmptyIDB(data: DBData): Promise<void> {
  const db = await openExistingDB();

  try {
    if (db.version !== DB_VERSION) {
      throw new Error(
        `IndexedDB version mismatch: expected ${DB_VERSION}, found ${db.version}.`
      );
    }
    for (const storeName of SNAPSHOT_STORE_NAMES) {
      if (!db.objectStoreNames.contains(storeName)) {
        throw new Error(`IndexedDB store "${storeName}" is missing.`);
      }
    }

    await new Promise<void>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = db.transaction([...SNAPSHOT_STORE_NAMES], 'readwrite');
      } catch (error) {
        reject(error);
        return;
      }

      const reads = SNAPSHOT_STORE_NAMES.map((storeName) => ({
        storeName,
        request: transaction.objectStore(storeName).getAll(),
      }));
      let readsRemaining = reads.length;
      let operationError: unknown = null;

      const abortWithError = (error: unknown) => {
        if (!operationError) operationError = error;
        try {
          transaction.abort();
        } catch {
          // A failed request may already have started the transaction abort.
        }
      };
      const watchWrite = (request: IDBRequest, description: string) => {
        request.onerror = () => {
          abortWithError(
            request.error || new DOMException(`Full backup restore ${description} failed.`)
          );
        };
      };
      const writeValidatedData = () => {
        try {
          const nonEmptyStore = reads.find(({ request }) => request.result.length > 0);
          if (nonEmptyStore) {
            abortWithError(
              new Error(
                `Restore stopped because IndexedDB store "${nonEmptyStore.storeName}" is no longer empty.`
              )
            );
            return;
          }

          const storesAndEntities = [
            ['vehicles', data.vehicles],
            ['records', data.records],
            ['issues', data.issues],
            ['maintenanceTasks', data.maintenanceTasks],
            ['documents', data.documents],
          ] as const;

          storesAndEntities.forEach(([storeName, entities]) => {
            const store = transaction.objectStore(storeName);
            watchWrite(store.clear(), `clear for ${storeName}`);
            entities.forEach((entity) => {
              watchWrite(store.put(entity), `write for ${storeName}/${entity.id}`);
            });
          });
        } catch (error) {
          abortWithError(error);
        }
      };

      reads.forEach(({ request, storeName }) => {
        request.onsuccess = () => {
          readsRemaining -= 1;
          if (readsRemaining === 0) writeValidatedData();
        };
        request.onerror = () => {
          abortWithError(
            request.error ||
              new DOMException(`Full backup restore validation read for ${storeName} failed.`)
          );
        };
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        reject(
          operationError ||
            transaction.error ||
            new DOMException('Full backup restore transaction failed.')
        );
      };
      transaction.onabort = () => {
        reject(
          operationError ||
            transaction.error ||
            new DOMException('Full backup restore transaction was aborted.')
        );
      };
    });
  } finally {
    db.close();
  }
}

export async function removeExactDemoDataFromIDB(): Promise<void> {
  const db = await openExistingDB();

  try {
    await new Promise<void>((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = db.transaction([...SNAPSHOT_STORE_NAMES], 'readwrite');
      } catch (error) {
        reject(error);
        return;
      }

      const reads = Object.fromEntries(
        SNAPSHOT_STORE_NAMES.map((storeName) => [
          storeName,
          transaction.objectStore(storeName).getAll(),
        ])
      ) as Record<(typeof SNAPSHOT_STORE_NAMES)[number], IDBRequest>;
      let remainingReads = SNAPSHOT_STORE_NAMES.length;
      let operationError: unknown = null;
      const abortWithError = (error: unknown) => {
        if (!operationError) operationError = error;
        try {
          transaction.abort();
        } catch {
          // A failed request may already be aborting the transaction.
        }
      };
      const validateAndDelete = () => {
        try {
          SNAPSHOT_STORE_NAMES.forEach((storeName) => {
            const entities = reads[storeName].result as Array<{ id: string }>;
            const byId = new Map(entities.map((entity) => [entity.id, entity]));
            DEMO_ID_MANIFEST[storeName].forEach((id) => {
              const entity = byId.get(id);
              if (!entity || !isExpectedDemoEntity(storeName, entity)) {
                throw new Error(
                  `Demo removal stopped because ${storeName}/${id} is missing or differs from the recognized demo entity.`
                );
              }
            });
          });

          SNAPSHOT_STORE_NAMES.forEach((storeName) => {
            const store = transaction.objectStore(storeName);
            DEMO_ID_MANIFEST[storeName].forEach((id) => {
              const request = store.delete(id);
              request.onerror = () => {
                abortWithError(
                  request.error ||
                    new DOMException(`Failed to remove demo entity ${storeName}/${id}.`)
                );
              };
            });
          });
        } catch (error) {
          abortWithError(error);
        }
      };

      SNAPSHOT_STORE_NAMES.forEach((storeName) => {
        const request = reads[storeName];
        request.onsuccess = () => {
          remainingReads -= 1;
          if (remainingReads === 0) validateAndDelete();
        };
        request.onerror = () => {
          abortWithError(
            request.error ||
              new DOMException(`Failed to validate demo store ${storeName}.`)
          );
        };
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        reject(
          operationError ||
            transaction.error ||
            new DOMException('Demo removal transaction failed.')
        );
      };
      transaction.onabort = () => {
        reject(
          operationError ||
            transaction.error ||
            new DOMException('Demo removal transaction was aborted.')
        );
      };
    });
  } finally {
    db.close();
  }
}

export async function initIndexedDB(): Promise<DBData> {
  const db = await openDB();

  try {
    const vehicles = await getAllFromStore<Vehicle>(db, 'vehicles');
    const records = await getAllFromStore<ServiceRecord>(db, 'records');
    const issues = await getAllFromStore<ActiveIssue>(db, 'issues');
    const maintenanceTasks = await getAllFromStore<MaintenancePlan>(
      db,
      'maintenanceTasks'
    );
    const documents = await getAllFromStore<Attachment>(db, 'documents');

    return { vehicles, records, issues, maintenanceTasks, documents };
  } finally {
    db.close();
  }
}

export async function saveVehicleToIDB(vehicle: Vehicle): Promise<void> {
  const db = await openDB();
  try {
    await putInStore(db, 'vehicles', vehicle);
  } finally {
    db.close();
  }
}

export async function saveRecordToIDB(record: ServiceRecord): Promise<void> {
  const db = await openDB();
  try {
    await putInStore(db, 'records', record);
  } finally {
    db.close();
  }
}

export async function saveRecordAndVehicleToIDB(
  record: ServiceRecord,
  vehicle: Vehicle
): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['records', 'vehicles'], 'readwrite');
      const recordRequest = transaction.objectStore('records').put(record);
      const vehicleRequest = transaction.objectStore('vehicles').put(vehicle);
      let requestError: DOMException | null = null;

      [recordRequest, vehicleRequest].forEach((request) => {
        request.onerror = () => {
          requestError =
            request.error ||
            new DOMException('Failed to save service record and vehicle mileage.');
          reject(requestError);
        };
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(
          transaction.error ||
            requestError ||
            new DOMException('Service record transaction failed.')
        );
      transaction.onabort = () =>
        reject(
          transaction.error ||
            requestError ||
            new DOMException('Service record transaction was aborted.')
        );
    });
  } finally {
    db.close();
  }
}

export async function deleteRecordFromIDB(id: string): Promise<void> {
  const db = await openDB();
  try {
    await deleteFromStore(db, 'records', id);
  } finally {
    db.close();
  }
}

export async function saveIssueToIDB(issue: ActiveIssue): Promise<void> {
  const db = await openDB();
  try {
    await putInStore(db, 'issues', issue);
  } finally {
    db.close();
  }
}

export async function deleteIssueFromIDB(id: string): Promise<void> {
  const db = await openDB();
  try {
    await deleteFromStore(db, 'issues', id);
  } finally {
    db.close();
  }
}

export async function saveTaskToIDB(task: MaintenancePlan): Promise<void> {
  const db = await openDB();
  try {
    await putInStore(db, 'maintenanceTasks', task);
  } finally {
    db.close();
  }
}

export async function deleteTaskFromIDB(id: string): Promise<void> {
  const db = await openDB();
  try {
    await deleteFromStore(db, 'maintenanceTasks', id);
  } finally {
    db.close();
  }
}

export async function saveDocumentToIDB(doc: Attachment): Promise<void> {
  const db = await openDB();
  try {
    await putInStore(db, 'documents', doc);
  } finally {
    db.close();
  }
}

export async function deleteVehicleFromIDB(id: string): Promise<void> {
  const db = await openDB();
  try {
    await deleteFromStore(db, 'vehicles', id);
  } finally {
    db.close();
  }
}

export async function deleteDocumentFromIDB(id: string): Promise<void> {
  const db = await openDB();
  try {
    await deleteFromStore(db, 'documents', id);
  } finally {
    db.close();
  }
}
