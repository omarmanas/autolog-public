import {
  ActiveIssue,
  Attachment,
  ImportBatchRecord,
  MaintenancePlan,
  ServiceRecord,
  Vehicle,
} from '../types';
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BackupCounts,
  BackupPreferences,
  calculateBackupPayloadChecksum,
  FullBackup,
  FullBackupData,
} from './backup';
import {
  DBData,
  DB_NAME,
  DB_VERSION,
  restoreFullBackupToEmptyIDB,
} from './idb';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const THEMES = new Set(['light', 'dark', 'system']);
const UNITS = new Set(['miles', 'km']);
const ISSUE_SEVERITIES = new Set(['Low', 'Medium', 'High', 'Critical']);
const ISSUE_STATUSES = new Set(['Open', 'Monitoring', 'Scheduled', 'Resolved']);
const PLAN_STATUSES = new Set(['Overdue', 'Due Soon', 'OK', 'Upcoming']);
const DOCUMENT_CATEGORIES = new Set([
  'Invoice',
  'Manual',
  'Insurance',
  'Registration',
  'Inspection',
  'Warranty',
  'Receipt',
]);
const DOCUMENT_STATUSES = new Set(['Verified', 'Unparsed', 'Archived']);
const DATE_PRECISIONS = new Set(['Exact', 'Month', 'Year', 'Unknown']);
const MILEAGE_PRECISIONS = new Set(['Exact', 'Estimated', 'Unknown']);
const RECORD_STATUSES = new Set([
  'Completed',
  'Diagnostic Only',
  'Inspection Only',
  'Parts Purchased',
  'User-Completed',
  'Recommended',
  'Declined',
  'Deferred',
  'Planned',
  'Monitoring',
  'Completion Unverified',
  'Mileage Observation',
  'Administrative Only',
]);
const SOURCE_TYPES = new Set([
  'Invoice',
  'Receipt',
  'Carfax',
  'UserEntry',
  'Inspection',
  'Other',
]);
const CONFIDENCE_GRADES = new Set(['A', 'B', 'C', 'D', 'E']);
const PROVIDER_TYPES = new Set([
  'Dealer',
  'Independent Shop',
  'Chain',
  'DIY',
  'Mobile Service',
  'Inspection Station',
]);
const MATERIAL_UNITS = new Set(['Quarts', 'Gallons', 'Liters', 'Ounces', 'Units']);

export interface ValidatedFullBackup {
  backup: FullBackup;
  snapshot: DBData;
}

function fail(message: string): never {
  throw new Error(`Invalid AutoLog backup: ${message}`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (!isObject(value)) fail(`${path} must be an object.`);
  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(`${path} must be an array.`);
  return value;
}

function requireString(value: unknown, path: string, allowEmpty = true): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    fail(`${path} must be ${allowEmpty ? 'a string' : 'a non-empty string'}.`);
  }
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${path} must be a finite number.`);
  }
  return value;
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(`${path} must be a boolean.`);
  return value;
}

function requireEnum(value: unknown, values: Set<string>, path: string): string {
  const stringValue = requireString(value, path);
  if (!values.has(stringValue)) fail(`${path} has an unsupported value.`);
  return stringValue;
}

function validateOptionalString(value: unknown, path: string): void {
  if (value !== undefined) requireString(value, path);
}

function validateOptionalNumber(value: unknown, path: string): void {
  if (value !== undefined) requireNumber(value, path);
}

function validateUntrustedTree(value: unknown, path = 'backup', seen = new WeakSet<object>()): void {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined'
  ) {
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(`${path} contains a non-finite number.`);
    return;
  }
  if (typeof value !== 'object') fail(`${path} contains a non-JSON-safe value.`);
  if (seen.has(value)) fail(`${path} contains a circular reference.`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      value.forEach((item, index) => validateUntrustedTree(item, `${path}[${index}]`, seen));
      return;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      fail(`${path} has an unsupported object prototype.`);
    }
    Object.keys(value).forEach((key) => {
      if (FORBIDDEN_KEYS.has(key)) fail(`${path} contains forbidden key "${key}".`);
      validateUntrustedTree((value as Record<string, unknown>)[key], `${path}.${key}`, seen);
    });
  } finally {
    seen.delete(value);
  }
}

function validateIds(items: unknown[], name: string): Set<string> {
  const ids = new Set<string>();
  items.forEach((item, index) => {
    const object = requireObject(item, `data.${name}[${index}]`);
    const id = requireString(object.id, `data.${name}[${index}].id`, false);
    if (ids.has(id)) fail(`duplicate ID "${id}" in data.${name}.`);
    ids.add(id);
  });
  return ids;
}

function validateVehicle(value: unknown, index: number): void {
  const path = `data.vehicles[${index}]`;
  const item = requireObject(value, path);
  requireString(item.id, `${path}.id`, false);
  requireString(item.make, `${path}.make`);
  requireString(item.model, `${path}.model`);
  requireNumber(item.year, `${path}.year`);
  requireString(item.trim, `${path}.trim`);
  requireString(item.vin, `${path}.vin`);
  requireString(item.licensePlate, `${path}.licensePlate`);
  requireNumber(item.currentMileage, `${path}.currentMileage`);
  requireString(item.engine, `${path}.engine`);
  requireString(item.transmission, `${path}.transmission`);
  requireString(item.fuelType, `${path}.fuelType`);
  requireString(item.color, `${path}.color`);
  requireString(item.oilSpecification, `${path}.oilSpecification`);
  requireString(item.tireSize, `${path}.tireSize`);
  validateOptionalNumber(item.purchaseMileage, `${path}.purchaseMileage`);
  validateOptionalString(item.purchaseDate, `${path}.purchaseDate`);
}

function validateRecord(value: unknown, index: number): void {
  const path = `data.serviceRecords[${index}]`;
  const item = requireObject(value, path);
  requireString(item.id, `${path}.id`, false);
  requireString(item.vehicleId, `${path}.vehicleId`, false);
  requireEnum(item.datePrecision, DATE_PRECISIONS, `${path}.datePrecision`);
  requireEnum(item.mileagePrecision, MILEAGE_PRECISIONS, `${path}.mileagePrecision`);
  if (typeof item.provider !== 'string') {
    const provider = requireObject(item.provider, `${path}.provider`);
    requireString(provider.id, `${path}.provider.id`, false);
    requireString(provider.name, `${path}.provider.name`);
    requireEnum(provider.type, PROVIDER_TYPES, `${path}.provider.type`);
  }
  requireString(item.category, `${path}.category`);
  requireEnum(item.status, RECORD_STATUSES, `${path}.status`);
  requireString(item.workPerformed, `${path}.workPerformed`);
  requireArray(item.partsReplaced, `${path}.partsReplaced`).forEach((part, partIndex) => {
    const partPath = `${path}.partsReplaced[${partIndex}]`;
    const partObject = requireObject(part, partPath);
    requireString(partObject.id, `${partPath}.id`, false);
    requireString(partObject.name, `${partPath}.name`);
    requireNumber(partObject.quantity, `${partPath}.quantity`);
    requireNumber(partObject.unitCost, `${partPath}.unitCost`);
    requireNumber(partObject.totalCost, `${partPath}.totalCost`);
    validateOptionalNumber(partObject.warrantyMonths, `${partPath}.warrantyMonths`);
  });
  requireArray(item.fluidsAndMaterials, `${path}.fluidsAndMaterials`).forEach(
    (material, materialIndex) => {
      const materialPath = `${path}.fluidsAndMaterials[${materialIndex}]`;
      const materialObject = requireObject(material, materialPath);
      requireString(materialObject.id, `${materialPath}.id`, false);
      requireString(materialObject.name, `${materialPath}.name`);
      requireNumber(materialObject.quantity, `${materialPath}.quantity`);
      requireEnum(
        materialObject.unitOfMeasure,
        MATERIAL_UNITS,
        `${materialPath}.unitOfMeasure`
      );
      requireNumber(materialObject.unitCost, `${materialPath}.unitCost`);
      requireNumber(materialObject.totalCost, `${materialPath}.totalCost`);
    }
  );
  [
    'laborCost',
    'partsCost',
    'fees',
    'tax',
    'processingFee',
    'discount',
    'dealerCredit',
    'finalInvoiceTotal',
    'actualDocumentedPayment',
  ].forEach((field) => requireNumber(item[field], `${path}.${field}`));
  [
    'mileageIn',
    'mileageOut',
    'evidencePage',
    'nextServiceMileage',
    'mileage',
    'totalCost',
    'sourceRowNumber',
  ].forEach((field) => validateOptionalNumber(item[field], `${path}.${field}`));
  requireEnum(item.sourceType, SOURCE_TYPES, `${path}.sourceType`);
  requireEnum(item.confidenceGrade, CONFIDENCE_GRADES, `${path}.confidenceGrade`);
  requireBoolean(item.verificationNeeded, `${path}.verificationNeeded`);
  if (item.costBreakdown !== undefined) {
    const breakdown = requireObject(item.costBreakdown, `${path}.costBreakdown`);
    [
      'laborCost',
      'partsCost',
      'fees',
      'tax',
      'processingFee',
      'discount',
      'dealerCredit',
      'finalInvoiceTotal',
      'actualDocumentedPayment',
    ].forEach((field) => requireNumber(breakdown[field], `${path}.costBreakdown.${field}`));
  }
}

function validateIssue(value: unknown, index: number): void {
  const path = `data.activeIssues[${index}]`;
  const item = requireObject(value, path);
  requireString(item.id, `${path}.id`, false);
  requireString(item.vehicleId, `${path}.vehicleId`, false);
  requireString(item.title, `${path}.title`);
  requireEnum(item.severity, ISSUE_SEVERITIES, `${path}.severity`);
  requireEnum(item.status, ISSUE_STATUSES, `${path}.status`);
  requireString(item.reportedDate, `${path}.reportedDate`);
  requireString(item.description, `${path}.description`);
  requireArray(item.tags, `${path}.tags`).forEach((tag, tagIndex) =>
    requireString(tag, `${path}.tags[${tagIndex}]`)
  );
  validateOptionalNumber(item.reportedMileage, `${path}.reportedMileage`);
  validateOptionalNumber(item.estimatedCost, `${path}.estimatedCost`);
  validateOptionalNumber(item.sourceRowNumber, `${path}.sourceRowNumber`);
}

function validatePlan(value: unknown, index: number): void {
  const path = `data.maintenancePlans[${index}]`;
  const item = requireObject(value, path);
  requireString(item.id, `${path}.id`, false);
  requireString(item.vehicleId, `${path}.vehicleId`, false);
  requireString(item.title, `${path}.title`);
  requireString(item.category, `${path}.category`);
  ['intervalMiles', 'intervalMonths', 'dueMileage', 'estimatedCost'].forEach((field) =>
    requireNumber(item[field], `${path}.${field}`)
  );
  validateOptionalNumber(item.lastPerformedMileage, `${path}.lastPerformedMileage`);
  validateOptionalNumber(item.sourceRowNumber, `${path}.sourceRowNumber`);
  requireEnum(item.status, PLAN_STATUSES, `${path}.status`);
  requireString(item.description, `${path}.description`);
}

function validateDocument(value: unknown, index: number): void {
  const path = `data.documents[${index}]`;
  const item = requireObject(value, path);
  requireString(item.id, `${path}.id`, false);
  requireString(item.vehicleId, `${path}.vehicleId`, false);
  requireString(item.title, `${path}.title`);
  requireEnum(item.category, DOCUMENT_CATEGORIES, `${path}.category`);
  requireString(item.uploadDate, `${path}.uploadDate`);
  requireString(item.fileSize, `${path}.fileSize`);
  requireString(item.fileName, `${path}.fileName`);
  requireString(item.fileType, `${path}.fileType`);
  requireEnum(item.status, DOCUMENT_STATUSES, `${path}.status`);
  validateOptionalNumber(item.pageCount, `${path}.pageCount`);
}

function validateImportHistory(value: unknown, index: number): void {
  const path = `data.importHistory[${index}]`;
  const item = requireObject(value, path);
  requireString(item.id, `${path}.id`, false);
  requireString(item.timestamp, `${path}.timestamp`);
  requireString(item.filename, `${path}.filename`);
  [
    'recordsAdded',
    'recordsUpdated',
    'recordsSkipped',
    'issuesAdded',
    'plansAdded',
    'documentsAdded',
  ].forEach((field) => requireNumber(item[field], `${path}.${field}`));
  requireString(item.snapshotBackup, `${path}.snapshotBackup`);
}

function validatePreferences(value: unknown, vehicleIds: Set<string>): BackupPreferences {
  const preferences = requireObject(value, 'data.preferences');
  const theme = requireEnum(preferences.theme, THEMES, 'data.preferences.theme');
  const unitSystem = requireEnum(
    preferences.unitSystem,
    UNITS,
    'data.preferences.unitSystem'
  );
  const currencySymbol = requireString(
    preferences.currencySymbol,
    'data.preferences.currencySymbol',
    false
  );
  const activeVehicleId = preferences.activeVehicleId;
  if (
    activeVehicleId !== undefined &&
    activeVehicleId !== null &&
    typeof activeVehicleId !== 'string'
  ) {
    fail('data.preferences.activeVehicleId must be a string or null.');
  }
  const normalizedActiveVehicleId =
    typeof activeVehicleId === 'string' && activeVehicleId.trim() ? activeVehicleId : null;
  if (normalizedActiveVehicleId && !vehicleIds.has(normalizedActiveVehicleId)) {
    fail('data.preferences.activeVehicleId does not reference a restored vehicle.');
  }
  return {
    theme: theme as BackupPreferences['theme'],
    activeVehicleId: normalizedActiveVehicleId,
    unitSystem: unitSystem as BackupPreferences['unitSystem'],
    currencySymbol,
  };
}

function verifyRelationships(
  items: unknown[],
  name: string,
  vehicleIds: Set<string>
): void {
  items.forEach((value, index) => {
    const item = requireObject(value, `data.${name}[${index}]`);
    const vehicleId = requireString(
      item.vehicleId,
      `data.${name}[${index}].vehicleId`,
      false
    );
    if (!vehicleIds.has(vehicleId)) {
      fail(`data.${name}[${index}] references missing vehicle "${vehicleId}".`);
    }
  });
}

function requireCount(value: unknown, path: string): number {
  const count = requireNumber(value, path);
  if (!Number.isInteger(count) || count < 0) fail(`${path} must be a non-negative integer.`);
  return count;
}

export async function validateFullBackup(input: unknown): Promise<ValidatedFullBackup> {
  validateUntrustedTree(input);
  const root = requireObject(input, 'backup');
  if (root.format !== BACKUP_FORMAT) fail(`format must be "${BACKUP_FORMAT}".`);
  if (root.formatVersion !== BACKUP_FORMAT_VERSION) {
    fail(`formatVersion must be ${BACKUP_FORMAT_VERSION}.`);
  }
  const exportedAt = requireString(root.exportedAt, 'exportedAt', false);
  if (Number.isNaN(Date.parse(exportedAt))) fail('exportedAt must be a valid timestamp.');
  requireString(root.appVersion, 'appVersion', false);

  const database = requireObject(root.database, 'database');
  if (database.name !== DB_NAME || database.version !== DB_VERSION) {
    fail(`database must be ${DB_NAME} version ${DB_VERSION}.`);
  }

  const data = requireObject(root.data, 'data');
  const vehicles = requireArray(data.vehicles, 'data.vehicles');
  const serviceRecords = requireArray(data.serviceRecords, 'data.serviceRecords');
  const activeIssues = requireArray(data.activeIssues, 'data.activeIssues');
  const maintenancePlans = requireArray(data.maintenancePlans, 'data.maintenancePlans');
  const documents = requireArray(data.documents, 'data.documents');
  const history = data.importHistory === undefined
    ? []
    : requireArray(data.importHistory, 'data.importHistory');
  if (vehicles.length === 0) fail('onboarding restore requires at least one vehicle.');

  const vehicleIds = validateIds(vehicles, 'vehicles');
  validateIds(serviceRecords, 'serviceRecords');
  validateIds(activeIssues, 'activeIssues');
  validateIds(maintenancePlans, 'maintenancePlans');
  validateIds(documents, 'documents');
  validateIds(history, 'importHistory');
  vehicles.forEach(validateVehicle);
  serviceRecords.forEach(validateRecord);
  activeIssues.forEach(validateIssue);
  maintenancePlans.forEach(validatePlan);
  documents.forEach(validateDocument);
  history.forEach(validateImportHistory);
  verifyRelationships(serviceRecords, 'serviceRecords', vehicleIds);
  verifyRelationships(activeIssues, 'activeIssues', vehicleIds);
  verifyRelationships(maintenancePlans, 'maintenancePlans', vehicleIds);
  verifyRelationships(documents, 'documents', vehicleIds);
  const preferences = validatePreferences(data.preferences, vehicleIds);

  const validation = requireObject(root.validation, 'validation');
  if (validation.checksumAlgorithm !== 'SHA-256') {
    fail('validation.checksumAlgorithm must be "SHA-256".');
  }
  const expectedChecksum = requireString(
    validation.payloadChecksum,
    'validation.payloadChecksum',
    false
  ).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedChecksum)) {
    fail('validation.payloadChecksum must be a SHA-256 hex digest.');
  }
  const actualChecksum = await calculateBackupPayloadChecksum(data);
  if (actualChecksum !== expectedChecksum) fail('payload checksum does not match.');

  const counts = requireObject(validation.counts, 'validation.counts');
  const actualCounts: BackupCounts = {
    vehicles: vehicles.length,
    serviceRecords: serviceRecords.length,
    activeIssues: activeIssues.length,
    maintenancePlans: maintenancePlans.length,
    documents: documents.length,
    importHistory: history.length,
  };
  Object.entries(actualCounts).forEach(([name, actual]) => {
    if (requireCount(counts[name], `validation.counts.${name}`) !== actual) {
      fail(`validation.counts.${name} does not match the payload.`);
    }
  });
  if (validation.includesDocumentFiles !== false) {
    fail('validation.includesDocumentFiles must be false.');
  }
  if (validation.importHistoryPersistence !== 'session-only') {
    fail('validation.importHistoryPersistence must be "session-only".');
  }

  const validatedData: FullBackupData = {
    vehicles: vehicles as Vehicle[],
    serviceRecords: serviceRecords as ServiceRecord[],
    activeIssues: activeIssues as ActiveIssue[],
    maintenancePlans: maintenancePlans as MaintenancePlan[],
    documents: documents as Attachment[],
    preferences,
    importHistory: history as ImportBatchRecord[],
  };
  const backup = {
    ...root,
    data: validatedData,
  } as unknown as FullBackup;

  return {
    backup,
    snapshot: {
      vehicles: validatedData.vehicles,
      records: validatedData.serviceRecords,
      issues: validatedData.activeIssues,
      maintenanceTasks: validatedData.maintenancePlans,
      documents: validatedData.documents,
    },
  };
}

export async function parseFullBackupJson(json: string): Promise<ValidatedFullBackup> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    fail('file is not valid JSON.');
  }
  return validateFullBackup(parsed);
}

export async function restoreValidatedFullBackup(
  validated: ValidatedFullBackup
): Promise<void> {
  await restoreFullBackupToEmptyIDB(validated.snapshot);
}

export function selectRestoredActiveVehicleId(
  validated: ValidatedFullBackup
): string {
  const preferredId = validated.backup.data.preferences.activeVehicleId;
  return preferredId &&
    validated.snapshot.vehicles.some((vehicle) => vehicle.id === preferredId)
    ? preferredId
    : validated.snapshot.vehicles[0].id;
}

export async function persistRestoreThenApply(
  validated: ValidatedFullBackup,
  applyCommittedRestore: (
    validatedBackup: ValidatedFullBackup,
    activeVehicleId: string
  ) => void,
  persist: (backup: ValidatedFullBackup) => Promise<void> = restoreValidatedFullBackup
): Promise<void> {
  await persist(validated);
  applyCommittedRestore(validated, selectRestoredActiveVehicleId(validated));
}
