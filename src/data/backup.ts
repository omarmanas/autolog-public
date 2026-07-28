import {
  ActiveIssue,
  Attachment,
  ImportBatchRecord,
  MaintenancePlan,
  ServiceRecord,
  Vehicle,
} from '../types';
import { APP_VERSION } from '../appMetadata';
import { DBData, DB_NAME, DB_VERSION } from './idb';

export const BACKUP_FORMAT = 'autolog.full-backup';
export const BACKUP_FORMAT_VERSION = 1;
export { APP_VERSION } from '../appMetadata';

export interface BackupPreferences {
  theme: 'light' | 'dark' | 'system';
  activeVehicleId: string | null;
  unitSystem: 'miles' | 'km';
  currencySymbol: string;
}

export interface FullBackupData {
  vehicles: Vehicle[];
  serviceRecords: ServiceRecord[];
  activeIssues: ActiveIssue[];
  maintenancePlans: MaintenancePlan[];
  documents: Attachment[];
  preferences: BackupPreferences;
  importHistory: ImportBatchRecord[];
}

export interface BackupCounts {
  vehicles: number;
  serviceRecords: number;
  activeIssues: number;
  maintenancePlans: number;
  documents: number;
  importHistory: number;
}

export interface FullBackup {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  appVersion: string;
  database: {
    name: typeof DB_NAME;
    version: typeof DB_VERSION;
  };
  data: FullBackupData;
  validation: {
    checksumAlgorithm: 'SHA-256';
    payloadChecksum: string;
    counts: BackupCounts;
    includesDocumentFiles: false;
    importHistoryPersistence: 'session-only';
  };
}

export interface BackupArtifact {
  backup: FullBackup;
  filename: string;
  json: string;
}

interface CreateBackupOptions {
  exportedAt?: string;
  appVersion?: string;
}

function normalizeJsonValue(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>
): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number at ${path}.`);
    }
    return value;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'object') {
    throw new Error(`Non-JSON-safe value at ${path}.`);
  }

  if (ancestors.has(value)) {
    throw new Error(`Circular reference at ${path}.`);
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        const normalized = normalizeJsonValue(item, `${path}[${index}]`, ancestors);
        if (normalized === undefined) {
          throw new Error(`Undefined array value at ${path}[${index}].`);
        }
        return normalized;
      });
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Non-JSON-safe object at ${path}.`);
    }

    const symbolKey = Reflect.ownKeys(value).find((key) => typeof key === 'symbol');
    if (symbolKey) {
      throw new Error(`Symbol-keyed property at ${path}.`);
    }

    const normalizedObject: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      const normalized = normalizeJsonValue(
        (value as Record<string, unknown>)[key],
        `${path}.${key}`,
        ancestors
      );
      if (normalized !== undefined) {
        normalizedObject[key] = normalized;
      }
    }
    return normalizedObject;
  } finally {
    ancestors.delete(value);
  }
}

function normalizeForJson<T>(value: T): T {
  return normalizeJsonValue(value, 'data', new WeakSet<object>()) as T;
}

export function canonicalStringify(value: unknown): string {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return `{${Object.keys(objectValue)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(objectValue[key])}`)
      .join(',')}}`;
  }

  throw new Error('Cannot canonically serialize a non-JSON-safe value.');
}

function validateIds(collectionName: string, collection: readonly { id: string }[]): void {
  const ids = new Set<string>();

  collection.forEach((item, index) => {
    if (typeof item.id !== 'string' || item.id.trim().length === 0) {
      throw new Error(`Invalid ID in ${collectionName}[${index}].`);
    }
    if (ids.has(item.id)) {
      throw new Error(`Duplicate ID "${item.id}" in ${collectionName}.`);
    }
    ids.add(item.id);
  });
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 is unavailable in this browser.');
  }

  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function calculateBackupPayloadChecksum(data: unknown): Promise<string> {
  return sha256Hex(canonicalStringify(data));
}

function createFilename(exportedAt: string): string {
  const timestamp = new Date(exportedAt);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error('Backup export timestamp is invalid.');
  }

  const compactTimestamp = timestamp
    .toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-')
    .replace(/:/g, '');
  return `autolog-backup-${compactTimestamp}.json`;
}

export async function createFullBackup(
  snapshot: DBData,
  preferences: BackupPreferences,
  importHistory: readonly ImportBatchRecord[],
  options: CreateBackupOptions = {}
): Promise<FullBackup> {
  const exportedAt = options.exportedAt || new Date().toISOString();
  const data = normalizeForJson<FullBackupData>({
    vehicles: snapshot.vehicles,
    serviceRecords: snapshot.records,
    activeIssues: snapshot.issues,
    maintenancePlans: snapshot.maintenanceTasks,
    documents: snapshot.documents,
    preferences,
    importHistory: [...importHistory],
  });

  validateIds('vehicles', data.vehicles);
  validateIds('serviceRecords', data.serviceRecords);
  validateIds('activeIssues', data.activeIssues);
  validateIds('maintenancePlans', data.maintenancePlans);
  validateIds('documents', data.documents);
  validateIds('importHistory', data.importHistory);

  const counts: BackupCounts = {
    vehicles: data.vehicles.length,
    serviceRecords: data.serviceRecords.length,
    activeIssues: data.activeIssues.length,
    maintenancePlans: data.maintenancePlans.length,
    documents: data.documents.length,
    importHistory: data.importHistory.length,
  };
  const payloadChecksum = await calculateBackupPayloadChecksum(data);

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    appVersion: options.appVersion || APP_VERSION,
    database: {
      name: DB_NAME,
      version: DB_VERSION,
    },
    data,
    validation: {
      checksumAlgorithm: 'SHA-256',
      payloadChecksum,
      counts,
      includesDocumentFiles: false,
      importHistoryPersistence: 'session-only',
    },
  };
}

export async function createBackupArtifact(
  snapshot: DBData,
  preferences: BackupPreferences,
  importHistory: readonly ImportBatchRecord[],
  options: CreateBackupOptions = {}
): Promise<BackupArtifact> {
  const backup = await createFullBackup(snapshot, preferences, importHistory, options);
  return {
    backup,
    filename: createFilename(backup.exportedAt),
    json: `${JSON.stringify(backup, null, 2)}\n`,
  };
}

export function downloadBackupArtifact(artifact: BackupArtifact): void {
  const blob = new Blob([artifact.json], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  try {
    link.href = objectUrl;
    link.download = artifact.filename;
    link.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
