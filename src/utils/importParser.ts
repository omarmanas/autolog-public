import type * as SheetJS from 'xlsx';
import {
  ServiceRecord,
  ActiveIssue,
  MaintenancePlan,
  Attachment,
  Part,
  FluidOrMaterial,
  ServiceRecordStatus,
  ConfidenceGrade,
  DatePrecision,
  MileagePrecision,
  IssueSeverity,
  IssueStatus,
  MaintenanceRuleStatus,
} from '../types';

export interface RejectedRow {
  sheetName: string;
  rowNumber: number; // 1-indexed row number in Excel sheet
  reason: string;
  rawContent?: string;
}

export interface ReconciliationReport {
  isValid: boolean;
  reasons: string[];
  masterRecordCount: number;
  issueCount: number;
  planCount: number;
  firstRecordId?: string;
  lastRecordId?: string;
}

export interface CostLedgerItem {
  recordId: string;
  baseRecordId: string;
  classification: 'Repair / Service' | 'Diagnostic' | 'DIY Parts' | 'Processing Fee';
  amountCents: number;
  notes?: string;
}

export interface CostSummaryCheck {
  repairServiceCents: number;
  diagnosticCents: number;
  invoiceBackedCents: number;
  diyPartsCents: number;
  processingFeesCents: number;
  openDataGapsCount: number;
  ledgerItems: CostLedgerItem[];
  repairServiceCost?: number;
  diagnosticSpending?: number;
  invoiceBackedTotal?: number;
  diyPartsTotal?: number;
  processingFeesTotal?: number;
}

export interface DataGapRecord {
  id: string;
  topic?: string;
  conflictOrMissingInfo?: string;
  currentWorkbookTreatment?: string;
  status: string;
  evidenceNeeded?: string;
  priority?: string;
  sourceSheet: string;
  sourceRowNumber: number;
}

export interface IgnoredStructuralRow {
  sheetName: string;
  rowNumber: number;
  reason: string;
  rawContent?: string;
}

export interface ParsedWorkbookData {
  sheetsFound: string[];
  canonicalSheets: string[];
  referenceOnlySheets: string[];
  records: ServiceRecord[];
  issues: ActiveIssue[];
  maintenanceTasks: MaintenancePlan[];
  documents: Attachment[];
  partsCount: number;
  fluidsCount: number;
  dataGapsCount: number;
  dataGaps?: DataGapRecord[];
  partsMap: Record<string, Part[]>;
  fluidsMap: Record<string, FluidOrMaterial[]>;
  costSummaryCheck?: CostSummaryCheck;
  rejectedRows: RejectedRow[];
  ignoredStructuralRows?: IgnoredStructuralRow[];
  warnings: string[];
  errors: string[];
  reconciliationErrors?: string[];
  reconciliation: ReconciliationReport;
}

type SpreadsheetReader = {
  read: typeof SheetJS.read;
  utils: {
    sheet_to_json: typeof SheetJS.utils.sheet_to_json;
  };
};

export interface DuplicateMatch {
  record: ServiceRecord;
  existingRecord: ServiceRecord;
  reason: string;
  choice: 'skip' | 'merge' | 'import_separately';
}

export const EXCLUDED_SHEETS = [
  'instructions & legend',
  'instructions',
  'legend',
  'dashboard',
  'parts & component lifecycle',
  'parts & components',
  'fluids & filters',
  'diagnostics & faults',
  'tires & brakes',
  'hvac & a/c',
  'cost summary',
  'recommendations & declined work',
  'document index',
  'data gaps & conflicts',
  'vehicle timeline',
];

export const SERVICE_HEADER_SIGNATURE = [
  ['recordid', 'record id'],
  ['servicedate', 'service date', 'date'],
  ['provider', 'shop', 'vendor'],
  ['category'],
  ['status'],
  ['workperformed', 'work performed', 'service description', 'description'],
];

export const ISSUE_HEADER_SIGNATURE = [
  ['issue', 'title', 'task'],
  ['system'],
  ['status'],
  ['priority', 'severity'],
  ['nextaction', 'next action', 'action', 'resolution'],
];

export const PLAN_HEADER_SIGNATURE = [
  ['item', 'task', 'title'],
  ['lastdocumenteddate', 'last date', 'due date', 'target date', 'last documented date'],
  ['lastmileage', 'due mileage', 'target mileage', 'last mileage'],
  ['interval', 'trigger', 'intervaltrigger', 'interval / trigger'],
  ['status'],
];

export const DATA_GAPS_HEADER_SIGNATURE = [
  ['gapid', 'gap id'],
  ['topic'],
  ['conflictmissinginformation', 'conflict / missing information', 'conflict missing information'],
  ['currentworkbooktreatment', 'current workbook treatment'],
  ['status'],
  ['evidenceneeded', 'evidence needed'],
  ['priority'],
];

function normalizeHeader(h: string): string {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function classifySheet(sheetName: string): 'master' | 'issues' | 'planner' | 'reference' {
  const norm = normalizeHeader(sheetName);

  if (EXCLUDED_SHEETS.some((ex) => norm.includes(normalizeHeader(ex)) || normalizeHeader(ex).includes(norm))) {
    return 'reference';
  }

  if (norm.includes('masterservice') || norm === 'masterservicehistory' || norm.includes('01masterservice')) {
    return 'master';
  }
  if (norm.includes('activeissue') || norm.includes('plannedwork') || norm.includes('02activeissue')) {
    return 'issues';
  }
  if (norm.includes('maintenanceplanner') || norm === 'planner' || norm.includes('03maintenanceplanner')) {
    return 'planner';
  }

  return 'reference';
}

function getVal(row: Record<string, any>, ...keys: string[]): any {
  const normKeys = keys.map(normalizeHeader);
  for (const k of Object.keys(row)) {
    const nk = normalizeHeader(k);
    if (normKeys.includes(nk)) {
      return row[k];
    }
  }
  return undefined;
}

function parseNumOptional(val: any): number | undefined {
  if (val === undefined || val === null || String(val).trim() === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  const str = String(val).replace(/[^0-9.-]/g, '');
  if (!str) return undefined;
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

function parseNum(val: any, fallback = 0): number {
  const parsed = parseNumOptional(val);
  return parsed !== undefined ? parsed : fallback;
}

function parseDateStr(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
}

export function findHeaderRow(
  matrix: any[][],
  signatureGroups: string[][]
): { headerRowIndex: number; headers: string[] } | null {
  const maxScan = Math.min(20, matrix.length);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const nonEmptyCells = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmptyCells.length < 2) continue;

    const cellNorms = row.map((cell) => normalizeHeader(String(cell || '')));

    const usedCellIndices = new Set<number>();
    const allGroupsMatched = signatureGroups.every((group) => {
      for (let cIdx = 0; cIdx < cellNorms.length; cIdx++) {
        const cellNorm = cellNorms[cIdx];
        if (!cellNorm) continue;
        if (usedCellIndices.has(cIdx)) continue;
        if (group.some((kw) => cellNorm.includes(normalizeHeader(kw)) || normalizeHeader(kw).includes(cellNorm))) {
          usedCellIndices.add(cIdx);
          return true;
        }
      }
      return false;
    });

    if (allGroupsMatched) {
      const headers = row.map((cell) => String(cell || '').trim());
      return { headerRowIndex: r, headers };
    }
  }
  return null;
}

export function parseImportFile(
  fileContent: ArrayBuffer | string,
  fileName: string,
  vehicleId: string,
  spreadsheet: SpreadsheetReader
): ParsedWorkbookData {
  const result: ParsedWorkbookData = {
    sheetsFound: [],
    canonicalSheets: [],
    referenceOnlySheets: [],
    records: [],
    issues: [],
    maintenanceTasks: [],
    documents: [],
    partsCount: 0,
    fluidsCount: 0,
    dataGapsCount: 0,
    partsMap: {},
    fluidsMap: {},
    rejectedRows: [],
    ignoredStructuralRows: [],
    warnings: [],
    errors: [],
    reconciliationErrors: [],
    reconciliation: {
      isValid: true,
      reasons: [],
      masterRecordCount: 0,
      issueCount: 0,
      planCount: 0,
    },
  };

  try {
    let workbook: SheetJS.WorkBook;

    if (fileName.toLowerCase().endsWith('.json')) {
      const text = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent);
      const json = JSON.parse(text);
      if (json.records && Array.isArray(json.records)) {
        result.records = json.records.map((r: any) => ({ ...r, vehicleId }));
      }
      if (json.issues && Array.isArray(json.issues)) {
        result.issues = json.issues.map((i: any) => ({ ...i, vehicleId }));
      }
      if (json.maintenanceTasks && Array.isArray(json.maintenanceTasks)) {
        result.maintenanceTasks = json.maintenanceTasks.map((t: any) => ({ ...t, vehicleId }));
      }
      if (json.documents && Array.isArray(json.documents)) {
        result.documents = json.documents.map((d: any) => ({ ...d, vehicleId }));
      }
      result.sheetsFound = ['JSON Export'];
      result.canonicalSheets = ['JSON Export'];
      result.reconciliation = {
        isValid: true,
        reasons: [],
        masterRecordCount: result.records.length,
        issueCount: result.issues.length,
        planCount: result.maintenanceTasks.length,
        firstRecordId: result.records[0]?.id,
        lastRecordId: result.records[result.records.length - 1]?.id,
      };
      return result;
    }

    if (typeof fileContent === 'string') {
      workbook = spreadsheet.read(fileContent, { type: 'string', cellDates: true });
    } else {
      workbook = spreadsheet.read(fileContent, { type: 'array', cellDates: true });
    }

    result.sheetsFound = workbook.SheetNames;

    for (const sheetName of workbook.SheetNames) {
      const sheetType = classifySheet(sheetName);

      if (sheetType === 'reference') {
        result.referenceOnlySheets.push(sheetName);

        const normName = normalizeHeader(sheetName);
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
          const matrix: any[][] = spreadsheet.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          if (normName.includes('costsummary')) {
            parseCostSummarySheet(matrix, result);
          } else if (normName.includes('datagaps')) {
            parseDataGapsSheet(matrix, result, sheetName);
          }
        }

        continue;
      }

      result.canonicalSheets.push(sheetName);
      const sheet = workbook.Sheets[sheetName];
      const matrix: any[][] = spreadsheet.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // A. MASTER SERVICE HISTORY ONLY
      if (sheetType === 'master') {
        const headerInfo = findHeaderRow(matrix, SERVICE_HEADER_SIGNATURE);

        if (!headerInfo) {
          result.warnings.push(`Could not locate canonical header row matching Service Header Signature in "${sheetName}". Sheet skipped.`);
          result.errors.push(`Header detection failed for routed worksheet "${sheetName}".`);
          continue;
        }

        const { headerRowIndex, headers } = headerInfo;

        // Classify pre-header preamble rows and header row as ignored structural metadata
        if (result.ignoredStructuralRows) {
          for (let r = 0; r <= headerRowIndex; r++) {
            const rowText = (matrix[r] || []).join(' ').trim();
            let reason = 'Title / Subtitle / Header preamble row ignored';
            if (r === headerRowIndex) {
              reason = 'Header row definition';
            } else if (!rowText) {
              reason = 'Empty / Blank row skipped';
            }
            result.ignoredStructuralRows.push({
              sheetName,
              rowNumber: r + 1,
              reason,
              rawContent: rowText,
            });
          }
        }

        const recordIdsSeen = new Set<string>();

        for (let r = headerRowIndex + 1; r < matrix.length; r++) {
          const row = matrix[r];
          if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
            if (result.ignoredStructuralRows) {
              result.ignoredStructuralRows.push({
                sheetName,
                rowNumber: r + 1,
                reason: 'Empty / Blank row skipped',
              });
            }
            continue;
          }

          const rowObj: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            if (h) rowObj[h] = row[colIdx];
          });

          const rawRecordId = getVal(
            rowObj,
            'Record ID', 'RecordID', 'Record_ID', 'Record', 'Ref ID', 'RefID', 'ID', 'Rec ID', 'RecID', 'REC_ID'
          );

          const fullRowText = row.map((c) => String(c || '')).join(' ').trim();
          const col0Str = String(row[0] || '').toLowerCase().trim();
          const rawIdStr = String(rawRecordId || '').toLowerCase().trim();

          // Classify summary, total, or footer/legend rows as ignored structural metadata
          const summaryKeywords = ['total', 'totals', 'summary', 'grand total', 'subtotal', 'average', 'instructions', 'legend', 'section'];
          const isTotalOrSummaryRow = summaryKeywords.some(
            (k) => rawIdStr === k || rawIdStr.startsWith(k + ' ') || rawIdStr.startsWith(k + ':') || col0Str === k || col0Str.startsWith(k + ' ') || col0Str.startsWith(k + ':')
          );

          if (isTotalOrSummaryRow) {
            if (result.ignoredStructuralRows) {
              result.ignoredStructuralRows.push({
                sheetName,
                rowNumber: r + 1,
                reason: `Totals / Summary / Footer row ignored ("${rawRecordId || row[0]}")`,
                rawContent: fullRowText.slice(0, 100),
              });
            }
            continue;
          }

          if (!rawRecordId || String(rawRecordId).trim() === '') {
            result.rejectedRows.push({
              sheetName,
              rowNumber: r + 1,
              reason: 'Missing Record ID',
              rawContent: fullRowText.slice(0, 100),
            });
            continue;
          }

          const recordId = String(rawRecordId).trim();

          if (recordIdsSeen.has(recordId)) {
            result.warnings.push(`Duplicate Record ID "${recordId}" in Master Service History (Row ${r + 1}). Skipped.`);
            result.rejectedRows.push({
              sheetName,
              rowNumber: r + 1,
              reason: `Duplicate Record ID "${recordId}" within sheet`,
            });
            continue;
          }

          recordIdsSeen.add(recordId);

          const serviceDate = parseDateStr(getVal(rowObj, 'Service Date', 'ServiceDate', 'Service_Date', 'Date', 'Date Performed', 'Tx Date'));
          const providerRaw = getVal(rowObj, 'Provider', 'Shop', 'Service Location', 'Vendor', 'Facility', 'Service Provider');
          const workPerfRaw = getVal(rowObj, 'Work Performed', 'WorkPerformed', 'Service Description', 'Description', 'Details');
          const invoiceNumRaw = getVal(rowObj, 'Repair Order / Invoice Number', 'Invoice Number', 'InvoiceNumber', 'RO Number', 'RO', 'Invoice');
          const mileageInRaw = getVal(rowObj, 'Mileage In', 'MileageIn', 'Odometer', 'Mileage');
          const mileageIn = parseNumOptional(mileageInRaw);
          const mileageOut = parseNumOptional(getVal(rowObj, 'Mileage Out', 'MileageOut')) ?? mileageIn;

          const provider = providerRaw ? String(providerRaw).trim() : '';
          const workPerformed = workPerfRaw ? String(workPerfRaw).trim() : '';

          const rawStatus = getVal(rowObj, 'Status');
          let status: ServiceRecordStatus = 'Completion Unverified';

          if (rawStatus && String(rawStatus).trim() !== '') {
            const validStatuses: ServiceRecordStatus[] = [
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
            ];

            const matched = validStatuses.find((vs) => normalizeHeader(vs) === normalizeHeader(String(rawStatus)));
            if (matched) {
              status = matched;
            } else {
              const normSt = normalizeHeader(String(rawStatus));
              if (normSt.includes('diagnostic')) status = 'Diagnostic Only';
              else if (normSt.includes('inspection')) status = 'Inspection Only';
              else if (normSt.includes('part')) status = 'Parts Purchased';
              else if (normSt.includes('diy') || normSt.includes('user')) status = 'User-Completed';
              else if (normSt.includes('recommend')) status = 'Recommended';
              else if (normSt.includes('declin')) status = 'Declined';
              else if (normSt.includes('defer')) status = 'Deferred';
              else if (normSt.includes('plan')) status = 'Planned';
              else if (normSt.includes('complet')) status = 'Completed';
              else status = 'Completion Unverified';
            }
          }

          const laborCost = parseNumOptional(getVal(rowObj, 'Labor Cost', 'LaborCost', 'Labor')) ?? 0;
          const partsCost = parseNumOptional(getVal(rowObj, 'Parts Cost', 'PartsCost')) ?? 0;
          const fees = parseNumOptional(getVal(rowObj, 'Fees', 'Shop Fees')) ?? 0;
          const tax = parseNumOptional(getVal(rowObj, 'Tax', 'Sales Tax')) ?? 0;
          const processingFee = parseNumOptional(getVal(rowObj, 'Processing Fee', 'ProcessingFee')) ?? 0;
          const discount = parseNumOptional(getVal(rowObj, 'Discount or Credit', 'Discount')) ?? 0;
          const dealerCredit = parseNumOptional(getVal(rowObj, 'Dealer Credit', 'DealerCredit')) ?? 0;

          const rawInvoiceTotal = getVal(rowObj, 'Final Invoice Total', 'FinalInvoiceTotal', 'Invoice Total');
          const rawPayment = getVal(rowObj, 'Actual Documented Payment', 'ActualDocumentedPayment', 'Payment', 'Total Cost', 'Total');

          const computedInvoiceTotal = Math.max(0, laborCost + partsCost + fees + tax + processingFee - discount - dealerCredit);
          const finalInvoiceTotal = (rawInvoiceTotal !== undefined && rawInvoiceTotal !== '') ? (parseNumOptional(rawInvoiceTotal) ?? computedInvoiceTotal) : computedInvoiceTotal;
          const actualDocumentedPayment = (rawPayment !== undefined && rawPayment !== '') ? (parseNumOptional(rawPayment) ?? finalInvoiceTotal) : finalInvoiceTotal;

          const datePrecision: DatePrecision = (getVal(rowObj, 'Date Precision', 'DatePrecision') || (serviceDate ? 'Exact' : 'Unknown')) as DatePrecision;
          const mileagePrecision: MileagePrecision = (getVal(rowObj, 'Mileage Precision', 'MileagePrecision') || (mileageIn !== undefined ? 'Exact' : 'Unknown')) as MileagePrecision;

          const location = getVal(rowObj, 'Location', 'Address', 'CityState') || '';
          const invoiceNumber = invoiceNumRaw ? String(invoiceNumRaw).trim() : '';
          const category = getVal(rowObj, 'Category', 'Service Type') || 'Maintenance';
          const complaintReason = getVal(rowObj, 'Complaint / Reason', 'Complaint') || '';
          const sourceType = (getVal(rowObj, 'Evidence Source', 'Source Type', 'Source') || 'Invoice') as any;
          const confidenceGrade: ConfidenceGrade = (getVal(rowObj, 'Confidence Grade', 'Grade') || 'B') as ConfidenceGrade;
          const evidenceFilename = getVal(rowObj, 'Evidence Filename', 'Filename') || '';
          const evidencePage = parseNumOptional(getVal(rowObj, 'Evidence Page', 'Page'));
          const duplicateGroupId = getVal(rowObj, 'Duplicate Group ID', 'DuplicateGroupID') || '';
          const verificationNeeded = Boolean(getVal(rowObj, 'Verification Needed') === true || getVal(rowObj, 'Verification Needed') === 'TRUE');
          const notes = getVal(rowObj, 'Notes', 'Comments') || '';

          const rec: ServiceRecord = {
            id: recordId,
            vehicleId,
            serviceDate: serviceDate || '',
            datePrecision,
            mileageIn,
            mileageOut,
            mileagePrecision,
            provider,
            location,
            invoiceNumber,
            category,
            complaintReason,
            status,
            workPerformed,
            partsReplaced: [],
            partNumbers: [],
            fluidsAndMaterials: [],
            laborCost,
            partsCost,
            fees,
            tax,
            processingFee,
            discount,
            dealerCredit,
            finalInvoiceTotal,
            actualDocumentedPayment,
            sourceType,
            confidenceGrade,
            evidenceFilename,
            evidencePage,
            duplicateGroupId,
            verificationNeeded,
            notes,
            date: serviceDate || '',
            mileage: mileageIn,
            title: workPerformed,
            totalCost: actualDocumentedPayment,
            receiptAttached: Boolean(evidenceFilename),
            sourceSheet: sheetName,
            sourceRowNumber: r + 1,
          };

          result.records.push(rec);
        }
      }

      // B. ACTIVE ISSUES & PLANNED WORK ONLY
      else if (sheetType === 'issues') {
        const headerInfo = findHeaderRow(matrix, ISSUE_HEADER_SIGNATURE);

        if (!headerInfo) {
          result.warnings.push(`Could not locate canonical header row matching Issue Header Signature in "${sheetName}". Sheet skipped.`);
          result.errors.push(`Header detection failed for routed worksheet "${sheetName}".`);
          continue;
        }

        const { headerRowIndex, headers } = headerInfo;

        if (result.ignoredStructuralRows) {
          for (let r = 0; r <= headerRowIndex; r++) {
            const rowText = (matrix[r] || []).join(' ').trim();
            let reason = 'Title / Subtitle / Header preamble row ignored';
            if (r === headerRowIndex) {
              reason = 'Header row definition';
            } else if (!rowText) {
              reason = 'Empty / Blank row skipped';
            }
            result.ignoredStructuralRows.push({
              sheetName,
              rowNumber: r + 1,
              reason,
              rawContent: rowText,
            });
          }
        }

        for (let r = headerRowIndex + 1; r < matrix.length; r++) {
          const row = matrix[r];
          if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
            if (result.ignoredStructuralRows) {
              result.ignoredStructuralRows.push({
                sheetName,
                rowNumber: r + 1,
                reason: 'Empty / Blank row skipped',
              });
            }
            continue;
          }

          const rowObj: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            if (h) rowObj[h] = row[colIdx];
          });

          const title = getVal(rowObj, 'Issue', 'Title', 'Task', 'Description');
          const fullRowText = row.map((c) => String(c || '')).join(' ').trim();
          const col0Str = String(row[0] || '').toLowerCase().trim();

          const summaryKeywords = ['total', 'totals', 'summary', 'grand total', 'subtotal', 'average', 'instructions', 'legend'];
          if (summaryKeywords.some((k) => col0Str === k || col0Str.startsWith(k + ' ') || col0Str.startsWith(k + ':'))) {
            if (result.ignoredStructuralRows) {
              result.ignoredStructuralRows.push({
                sheetName,
                rowNumber: r + 1,
                reason: `Totals / Summary / Footer row ignored ("${row[0]}")`,
                rawContent: fullRowText.slice(0, 100),
              });
            }
            continue;
          }

          if (!title || String(title).trim() === '') {
            result.rejectedRows.push({
              sheetName,
              rowNumber: r + 1,
              reason: 'Missing issue title',
            });
            continue;
          }

          const severity = (getVal(rowObj, 'Priority', 'Severity') || 'Medium') as IssueSeverity;
          const status = (getVal(rowObj, 'Status') || 'Open') as IssueStatus;
          const reportedDate = parseDateStr(getVal(rowObj, 'Reported Date', 'ReportedDate', 'Date')) || new Date().toISOString().split('T')[0];
          const reportedMileage = parseNumOptional(getVal(rowObj, 'Reported Mileage', 'ReportedMileage', 'Mileage'));
          const description = getVal(rowObj, 'Next action', 'Next Action', 'Description', 'Notes') || '';
          const estimatedCost = parseNumOptional(getVal(rowObj, 'Estimated Cost', 'EstimatedCost', 'Cost')) ?? 0;

          result.issues.push({
            id: getVal(rowObj, 'Issue ID', 'ID', 'Issue#') || `iss-${r + 1}`,
            vehicleId,
            title: String(title).trim(),
            severity,
            status,
            reportedDate,
            reportedMileage,
            description,
            estimatedCost,
            tags: ['imported'],
            sourceSheet: sheetName,
            sourceRowNumber: r + 1,
          });
        }
      }

      // C. MAINTENANCE PLANNER ONLY
      else if (sheetType === 'planner') {
        const headerInfo = findHeaderRow(matrix, PLAN_HEADER_SIGNATURE);

        if (!headerInfo) {
          result.warnings.push(`Could not locate canonical header row matching Plan Header Signature in "${sheetName}". Sheet skipped.`);
          result.errors.push(`Header detection failed for routed worksheet "${sheetName}".`);
          continue;
        }

        const { headerRowIndex, headers } = headerInfo;

        if (result.ignoredStructuralRows) {
          for (let r = 0; r <= headerRowIndex; r++) {
            const rowText = (matrix[r] || []).join(' ').trim();
            let reason = 'Title / Subtitle / Header preamble row ignored';
            if (r === headerRowIndex) {
              reason = 'Header row definition';
            } else if (!rowText) {
              reason = 'Empty / Blank row skipped';
            }
            result.ignoredStructuralRows.push({
              sheetName,
              rowNumber: r + 1,
              reason,
              rawContent: rowText,
            });
          }
        }

        for (let r = headerRowIndex + 1; r < matrix.length; r++) {
          const row = matrix[r];
          if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
            if (result.ignoredStructuralRows) {
              result.ignoredStructuralRows.push({
                sheetName,
                rowNumber: r + 1,
                reason: 'Empty / Blank row skipped',
              });
            }
            continue;
          }

          const rowObj: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            if (h) rowObj[h] = row[colIdx];
          });

          const title = getVal(rowObj, 'Item', 'Task', 'Title', 'Service');
          const fullRowText = row.map((c) => String(c || '')).join(' ').trim();
          const col0Str = String(row[0] || '').toLowerCase().trim();

          const summaryKeywords = ['total', 'totals', 'summary', 'grand total', 'subtotal', 'average', 'instructions', 'legend'];
          if (summaryKeywords.some((k) => col0Str === k || col0Str.startsWith(k + ' ') || col0Str.startsWith(k + ':'))) {
            if (result.ignoredStructuralRows) {
              result.ignoredStructuralRows.push({
                sheetName,
                rowNumber: r + 1,
                reason: `Totals / Summary / Footer row ignored ("${row[0]}")`,
                rawContent: fullRowText.slice(0, 100),
              });
            }
            continue;
          }

          if (!title || String(title).trim() === '') {
            result.rejectedRows.push({
              sheetName,
              rowNumber: r + 1,
              reason: 'Missing maintenance task title',
            });
            continue;
          }

          const category = getVal(rowObj, 'Category', 'System') || 'Maintenance';
          const dueMileage = parseNumOptional(getVal(rowObj, 'Last mileage', 'Due Mileage', 'Target Mileage')) ?? 0;
          const dueDate = parseDateStr(getVal(rowObj, 'Last documented date', 'Due Date', 'Target Date'));
          const intervalMiles = parseNumOptional(getVal(rowObj, 'Interval Miles', 'Interval (mi)')) ?? 5000;
          const intervalMonths = parseNumOptional(getVal(rowObj, 'Interval Months', 'Interval (mo)')) ?? 6;
          const status = (getVal(rowObj, 'Status') || 'OK') as MaintenanceRuleStatus;
          const estimatedCost = parseNumOptional(getVal(rowObj, 'Estimated Cost')) ?? 0;
          const description = getVal(rowObj, 'Interval / trigger', 'Trigger', 'Description', 'Notes') || '';

          result.maintenanceTasks.push({
            id: getVal(rowObj, 'Plan ID', 'ID') || `plan-${r + 1}`,
            vehicleId,
            title: String(title).trim(),
            category,
            dueMileage,
            dueDate,
            intervalMiles,
            intervalMonths,
            status,
            estimatedCost,
            description,
            sourceSheet: sheetName,
            sourceRowNumber: r + 1,
          });
        }
      }
    }
  } catch (err: any) {
    result.errors.push(`Failed to parse file: ${err.message || String(err)}`);
  }

  // Pre-import reconciliation report computation
  const reasons: string[] = [];

  const structuralEmitted =
    result.records.some((r) => r.sourceRowNumber !== undefined && r.sourceRowNumber <= 4) ||
    result.issues.some((i) => i.sourceRowNumber !== undefined && i.sourceRowNumber <= 4) ||
    result.maintenanceTasks.some((p) => p.sourceRowNumber !== undefined && p.sourceRowNumber <= 4);

  if (structuralEmitted) {
    reasons.push('Structural row (rows 1–4) was incorrectly emitted as a data record.');
  }

  const syntheticIds = result.records.some((r) => r.id.startsWith('rec-imp-'));
  if (syntheticIds) {
    reasons.push('Fallback synthetic Record IDs (rec-imp-*) were generated.');
  }

  const excludedContrib =
    result.records.some((r) => r.sourceSheet && classifySheet(r.sourceSheet) === 'reference') ||
    result.issues.some((i) => i.sourceSheet && classifySheet(i.sourceSheet) === 'reference') ||
    result.maintenanceTasks.some((p) => p.sourceSheet && classifySheet(p.sourceSheet) === 'reference');

  if (excludedContrib) {
    reasons.push('An excluded reference sheet contributed data records.');
  }

  result.reconciliation = {
    isValid: reasons.length === 0 && result.errors.length === 0,
    reasons,
    masterRecordCount: result.records.length,
    issueCount: result.issues.length,
    planCount: result.maintenanceTasks.length,
    firstRecordId: result.records[0]?.id,
    lastRecordId: result.records[result.records.length - 1]?.id,
  };

  return result;
}

export function findDuplicates(
  newRecords: ServiceRecord[],
  existingRecords: ServiceRecord[]
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (const newRec of newRecords) {
    for (const ext of existingRecords) {
      let isMatch = false;
      let reason = '';

      if (newRec.id && ext.id && newRec.id === ext.id) {
        isMatch = true;
        reason = `Matching Record ID (${newRec.id})`;
      } else if (
        newRec.invoiceNumber &&
        ext.invoiceNumber &&
        newRec.invoiceNumber.trim().toLowerCase() === ext.invoiceNumber.trim().toLowerCase() &&
        newRec.invoiceNumber.trim().length > 2
      ) {
        isMatch = true;
        reason = `Matching Repair Order / Invoice #${newRec.invoiceNumber}`;
      } else if (
        newRec.serviceDate &&
        ext.serviceDate &&
        newRec.serviceDate === ext.serviceDate &&
        newRec.mileageIn !== undefined &&
        ext.mileageIn !== undefined &&
        Math.abs(newRec.mileageIn - ext.mileageIn) < 10
      ) {
        isMatch = true;
        reason = `Matching Date (${newRec.serviceDate}) and Mileage (~${newRec.mileageIn} mi)`;
      }

      if (isMatch) {
        matches.push({
          record: newRec,
          existingRecord: ext,
          reason,
          choice: 'skip',
        });
        break;
      }
    }
  }

  return matches;
}

export function findDataGapsHeaderRow(
  matrix: any[][]
): { headerRowIndex: number; headers: string[] } | 'missing' | 'ambiguous' {
  const maxScan = Math.min(20, matrix.length);
  const matchingIndices: number[] = [];

  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const cellNorms = row.map((cell) => normalizeHeader(String(cell || '')));
    const usedCellIndices = new Set<number>();

    const allMatched = DATA_GAPS_HEADER_SIGNATURE.every((group) => {
      for (let cIdx = 0; cIdx < cellNorms.length; cIdx++) {
        const cellNorm = cellNorms[cIdx];
        if (!cellNorm) continue;
        if (usedCellIndices.has(cIdx)) continue;
        if (group.some((kw) => cellNorm.includes(normalizeHeader(kw)) || normalizeHeader(kw).includes(cellNorm))) {
          usedCellIndices.add(cIdx);
          return true;
        }
      }
      return false;
    });

    if (allMatched) {
      matchingIndices.push(r);
    }
  }

  if (matchingIndices.length === 0) return 'missing';
  if (matchingIndices.length > 1) return 'ambiguous';

  const r = matchingIndices[0];
  const headers = matrix[r].map((cell: any) => String(cell || '').trim());
  return { headerRowIndex: r, headers };
}

export function parseDataGapsSheet(
  matrix: any[][],
  result: ParsedWorkbookData,
  sheetName: string
) {
  const headerRes = findDataGapsHeaderRow(matrix);

  if (headerRes === 'missing') {
    result.errors.push(`Header detection failed for Data Gaps worksheet "${sheetName}": header signature missing.`);
    return;
  }
  if (headerRes === 'ambiguous') {
    result.errors.push(`Header detection failed for Data Gaps worksheet "${sheetName}": ambiguous multiple header rows detected.`);
    return;
  }

  const { headerRowIndex, headers } = headerRes;

  if (result.ignoredStructuralRows) {
    for (let r = 0; r <= headerRowIndex; r++) {
      const rowText = (matrix[r] || []).join(' ').trim();
      let reason = 'Title / Subtitle / Header preamble row ignored';
      if (r === headerRowIndex) {
        reason = 'Header row definition';
      } else if (!rowText) {
        reason = 'Empty / Blank row skipped';
      }
      result.ignoredStructuralRows.push({
        sheetName,
        rowNumber: r + 1,
        reason,
        rawContent: rowText,
      });
    }
  }

  const parsedGaps: DataGapRecord[] = [];

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
      if (result.ignoredStructuralRows) {
        result.ignoredStructuralRows.push({
          sheetName,
          rowNumber: r + 1,
          reason: 'Empty / Blank row skipped',
        });
      }
      continue;
    }

    const rowObj: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      if (h) rowObj[h] = row[colIdx];
    });

    const rawGapId = getVal(rowObj, 'Gap ID', 'GapID', 'Gap_ID', 'ID') || row[0];
    const gapIdStr = String(rawGapId || '').trim();

    if (!gapIdStr || !gapIdStr.toUpperCase().startsWith('GAP')) {
      result.errors.push(`Data Gaps parsing failed at row ${r + 1}: missing or invalid Gap ID ("${gapIdStr}").`);
      return;
    }

    const topic = String(getVal(rowObj, 'Topic') || '').trim();
    const conflictOrMissingInfo = String(getVal(rowObj, 'Conflict / missing information', 'Conflict', 'Missing Information') || '').trim();
    const currentWorkbookTreatment = String(getVal(rowObj, 'Current workbook treatment', 'Treatment') || '').trim();
    const rawStatus = String(getVal(rowObj, 'Status') || '').trim();
    const status = rawStatus || 'Open';
    const evidenceNeeded = String(getVal(rowObj, 'Evidence needed', 'Evidence') || '').trim();
    const priority = String(getVal(rowObj, 'Priority') || '').trim();

    parsedGaps.push({
      id: gapIdStr,
      topic,
      conflictOrMissingInfo,
      currentWorkbookTreatment,
      status,
      evidenceNeeded,
      priority,
      sourceSheet: sheetName,
      sourceRowNumber: r + 1,
    });
  }

  result.dataGapsCount = parsedGaps.length;
  result.dataGaps = parsedGaps;
}

export function parseCostSummarySheet(matrix: any[][], result: ParsedWorkbookData) {
  const ledgerHeaderInfo = findHeaderRow(matrix, [
    ['recordid', 'record id'],
    ['costclassification', 'cost classification', 'classification'],
    ['amount'],
  ]);

  const ledgerItems: CostLedgerItem[] = [];

  if (ledgerHeaderInfo) {
    const { headerRowIndex, headers } = ledgerHeaderInfo;
    for (let r = headerRowIndex + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) continue;

      const rowObj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        if (h) rowObj[h] = row[colIdx];
      });

      const rawRecordId = getVal(rowObj, 'Record ID', 'RecordID', 'Record_ID', 'Record', 'Ref ID', 'ID');
      if (!rawRecordId || String(rawRecordId).trim() === '') continue;

      const recIdStr = String(rawRecordId).trim();
      const lowerRecId = recIdStr.toLowerCase();
      if (lowerRecId.includes('total') || lowerRecId.includes('summary') || lowerRecId.includes('subtotal')) {
        continue;
      }

      const rawClass = getVal(rowObj, 'Cost classification', 'CostClassification', 'Classification') || getVal(rowObj, 'Category') || '';
      const rawAmount = getVal(rowObj, 'Amount', 'Cost', 'Total');
      const amountNum = parseNumOptional(rawAmount);
      if (amountNum === undefined) continue;

      const amountCents = Math.round(amountNum * 100);
      const notes = String(getVal(rowObj, 'Notes', 'Comments') || '');

      let baseRecordId = recIdStr;
      if (baseRecordId.includes('-')) {
        const parts = baseRecordId.split('-');
        if (parts[0] && parts[0].length >= 3) {
          baseRecordId = parts[0];
        }
      }

      let classification: 'Repair / Service' | 'Diagnostic' | 'DIY Parts' | 'Processing Fee' = 'Repair / Service';
      const normClass = normalizeHeader(String(rawClass));
      const normRecId = normalizeHeader(recIdStr);

      if (normClass.includes('fee') || normRecId.endsWith('fee')) {
        classification = 'Processing Fee';
      } else if (normClass.includes('diagnostic') || normRecId.endsWith('d')) {
        classification = 'Diagnostic';
      } else if (normClass.includes('diy') || normClass.includes('part') || normRecId.endsWith('p')) {
        classification = 'DIY Parts';
      } else {
        classification = 'Repair / Service';
      }

      ledgerItems.push({
        recordId: recIdStr,
        baseRecordId,
        classification,
        amountCents,
        notes,
      });
    }
  }

  let summaryRepairCents: number | undefined;
  let summaryDiagCents: number | undefined;
  let summaryInvoiceCents: number | undefined;
  let summaryDiyCents: number | undefined;
  let summaryFeesCents: number | undefined;
  let summaryGapsCount: number | undefined;

  const summaryHeaderInfo = findHeaderRow(matrix, [
    ['costcategory', 'category', 'summary', 'item', 'cost type'],
    ['amount', 'cost', 'total'],
  ]);

  let summaryCatCol = 0;
  let summaryAmtCol = 1;

  if (summaryHeaderInfo) {
    const { headers } = summaryHeaderInfo;
    summaryCatCol = headers.findIndex((h) => {
      const nh = normalizeHeader(h);
      return nh.includes('category') || nh.includes('item') || nh.includes('type') || nh.includes('summary');
    });
    if (summaryCatCol < 0) summaryCatCol = 0;

    summaryAmtCol = headers.findIndex((h) => normalizeHeader(h) === 'amount');
    if (summaryAmtCol < 0) {
      summaryAmtCol = headers.findIndex((h) => {
        const nh = normalizeHeader(h);
        return (
          (nh.includes('amount') || nh.includes('total') || nh.includes('cost')) &&
          !nh.includes('category') &&
          !nh.includes('classification') &&
          !nh.includes('type')
        );
      });
    }
    if (summaryAmtCol < 0) summaryAmtCol = summaryCatCol + 1;
  }

  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) continue;

    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const cellVal = String(row[cIdx] || '').trim();
      if (!cellVal) continue;
      const normCell = normalizeHeader(cellVal);

      const getAmtNum = (): number | undefined => {
        if (row[summaryAmtCol] !== undefined) {
          const num = parseNumOptional(row[summaryAmtCol]);
          if (num !== undefined) return num;
        }
        if (cIdx + 1 < row.length) {
          const num = parseNumOptional(row[cIdx + 1]);
          if (num !== undefined) return num;
        }
        if (cIdx + 2 < row.length) {
          const num = parseNumOptional(row[cIdx + 2]);
          if (num !== undefined) return num;
        }
        return undefined;
      };

      if (normCell === 'repairservicecost' || normCell === 'repairservice' || normCell === 'repairspending' || normCell === 'repaircost') {
        if (summaryRepairCents === undefined) {
          const num = getAmtNum();
          if (num !== undefined) summaryRepairCents = Math.round(num * 100);
        }
      } else if (normCell === 'diagnosticcost' || normCell === 'diagnostic' || normCell === 'diagnosticspending') {
        if (summaryDiagCents === undefined) {
          const num = getAmtNum();
          if (num !== undefined) summaryDiagCents = Math.round(num * 100);
        }
      } else if (normCell === 'diypartspurchases' || normCell === 'diyparts' || normCell === 'diypartscost' || normCell === 'diycost') {
        if (summaryDiyCents === undefined) {
          const num = getAmtNum();
          if (num !== undefined) summaryDiyCents = Math.round(num * 100);
        }
      } else if (
        normCell === 'processingpaymentfees' ||
        normCell === 'processingfee' ||
        normCell === 'processingfees' ||
        normCell === 'paymentfees'
      ) {
        if (summaryFeesCents === undefined) {
          const num = getAmtNum();
          if (num !== undefined) summaryFeesCents = Math.round(num * 100);
        }
      } else if (normCell === 'opendatagaps' || normCell === 'datagaps' || normCell === 'opendatagapsconflicts') {
        if (summaryGapsCount === undefined) {
          const num = getAmtNum();
          if (num !== undefined) summaryGapsCount = Math.round(num);
        }
      }
    }
  }

  if (summaryRepairCents !== undefined && summaryDiagCents !== undefined) {
    summaryInvoiceCents = summaryRepairCents + summaryDiagCents;
  }

  const repairServiceCents = ledgerItems.filter((i) => i.classification === 'Repair / Service').reduce((s, i) => s + i.amountCents, 0);
  const diagnosticCents = ledgerItems.filter((i) => i.classification === 'Diagnostic').reduce((s, i) => s + i.amountCents, 0);
  const diyPartsCents = ledgerItems.filter((i) => i.classification === 'DIY Parts').reduce((s, i) => s + i.amountCents, 0);
  const processingFeesCents = ledgerItems.filter((i) => i.classification === 'Processing Fee').reduce((s, i) => s + i.amountCents, 0);
  const invoiceBackedCents = repairServiceCents + diagnosticCents;

  if (!result.reconciliationErrors) {
    result.reconciliationErrors = [];
  }

  if (
    summaryRepairCents === undefined ||
    summaryDiagCents === undefined ||
    summaryDiyCents === undefined ||
    summaryFeesCents === undefined
  ) {
    result.reconciliationErrors.push(
      'Required benchmark cost label missing, duplicated, ambiguous, or non-numeric in Cost Summary table.'
    );
  }

  result.costSummaryCheck = {
    repairServiceCents: summaryRepairCents ?? repairServiceCents,
    diagnosticCents: summaryDiagCents ?? diagnosticCents,
    invoiceBackedCents: summaryInvoiceCents ?? invoiceBackedCents,
    diyPartsCents: summaryDiyCents ?? diyPartsCents,
    processingFeesCents: summaryFeesCents ?? processingFeesCents,
    openDataGapsCount: summaryGapsCount ?? result.dataGapsCount ?? 0,
    ledgerItems,
    repairServiceCost: (summaryRepairCents ?? repairServiceCents) / 100,
    diagnosticSpending: (summaryDiagCents ?? diagnosticCents) / 100,
    invoiceBackedTotal: (summaryInvoiceCents ?? invoiceBackedCents) / 100,
    diyPartsTotal: (summaryDiyCents ?? diyPartsCents) / 100,
    processingFeesTotal: (summaryFeesCents ?? processingFeesCents) / 100,
  };
}

export interface ReconciledCosts {
  repairServiceCents: number;
  diagnosticCents: number;
  invoiceBackedCents: number;
  diyPartsCents: number;
  processingFeesCents: number;
  openDataGapsCount: number;
  recordCostsMap: Record<string, { repair: number; diag: number; diy: number; fee: number }>;
}

export function calculateReconciliationCosts(
  records: ServiceRecord[],
  issues: ActiveIssue[],
  ledgerItems?: CostLedgerItem[],
  skippedRecordIds: Set<string> = new Set()
): ReconciledCosts {
  let repairServiceCents = 0;
  let diagnosticCents = 0;
  let diyPartsCents = 0;
  let processingFeesCents = 0;

  const recordCostsMap: Record<string, { repair: number; diag: number; diy: number; fee: number }> = {};

  records.forEach((rec) => {
    if (skippedRecordIds.has(rec.id)) return;

    if (
      rec.status === 'Completion Unverified' ||
      rec.status === 'Recommended' ||
      rec.status === 'Declined' ||
      rec.status === 'Planned'
    ) {
      return;
    }

    const recordLedger = ledgerItems?.filter((item) => item.baseRecordId === rec.id);

    if (recordLedger && recordLedger.length > 0) {
      let r = 0, d = 0, diy = 0, fee = 0;
      recordLedger.forEach((item) => {
        if (item.classification === 'Repair / Service') {
          repairServiceCents += item.amountCents;
          r += item.amountCents;
        } else if (item.classification === 'Diagnostic') {
          diagnosticCents += item.amountCents;
          d += item.amountCents;
        } else if (item.classification === 'DIY Parts') {
          diyPartsCents += item.amountCents;
          diy += item.amountCents;
        } else if (item.classification === 'Processing Fee') {
          processingFeesCents += item.amountCents;
          fee += item.amountCents;
        }
      });
      recordCostsMap[rec.id] = { repair: r, diag: d, diy, fee };
    } else {
      const feeCents = Math.round((rec.processingFee || 0) * 100);
      const rawInvNum = rec.finalInvoiceTotal ?? rec.actualDocumentedPayment ?? rec.totalCost ?? 0;
      const invCents = Math.round(rawInvNum * 100);

      let r = 0, d = 0, diy = 0, fee = feeCents;
      processingFeesCents += feeCents;

      if (rec.status === 'Parts Purchased' || rec.status === 'User-Completed' || rec.category?.toLowerCase().includes('diy')) {
        diyPartsCents += invCents;
        diy += invCents;
      } else if (rec.status === 'Diagnostic Only') {
        const netDiag = Math.max(0, invCents - feeCents);
        diagnosticCents += netDiag;
        d += netDiag;
      } else {
        const netRepair = Math.max(0, invCents - feeCents);
        repairServiceCents += netRepair;
        r += netRepair;
      }

      recordCostsMap[rec.id] = { repair: r, diag: d, diy, fee };
    }
  });

  const invoiceBackedCents = repairServiceCents + diagnosticCents;
  const openDataGapsCount = issues.filter((i) => i.tags?.includes('data-gap') || i.tags?.includes('imported')).length;

  return {
    repairServiceCents,
    diagnosticCents,
    invoiceBackedCents,
    diyPartsCents,
    processingFeesCents,
    openDataGapsCount,
    recordCostsMap,
  };
}

export interface ReconciliationGateEvaluation {
  canCommit: boolean;
  blockingReasons: string[];
  calculatedCents: ReconciledCosts;
  benchmarkCents: {
    repairServiceCents: number;
    diagnosticCents: number;
    invoiceBackedCents: number;
    diyPartsCents: number;
    processingFeesCents: number;
    openDataGapsCount: number;
  };
  deltasCents: {
    repair: number;
    diag: number;
    invoiceBacked: number;
    diy: number;
    fees: number;
    gaps: number;
  };
}

export function evaluateReconciliationGate(
  parsedData: ParsedWorkbookData | null,
  duplicates: DuplicateMatch[] = []
): ReconciliationGateEvaluation {
  const blockingReasons: string[] = [];

  if (!parsedData) {
    return {
      canCommit: false,
      blockingReasons: ['No parsed workbook data available.'],
      calculatedCents: { repairServiceCents: 0, diagnosticCents: 0, invoiceBackedCents: 0, diyPartsCents: 0, processingFeesCents: 0, openDataGapsCount: 0, recordCostsMap: {} },
      benchmarkCents: { repairServiceCents: 0, diagnosticCents: 0, invoiceBackedCents: 0, diyPartsCents: 0, processingFeesCents: 0, openDataGapsCount: 0 },
      deltasCents: { repair: 0, diag: 0, invoiceBacked: 0, diy: 0, fees: 0, gaps: 0 },
    };
  }

  const skippedRecordIds = new Set(
    duplicates.filter((d) => d.choice === 'skip').map((d) => d.record.id)
  );

  const calculated = calculateReconciliationCosts(
    parsedData.records,
    parsedData.issues,
    parsedData.costSummaryCheck?.ledgerItems,
    skippedRecordIds
  );

  const benchmark = {
    repairServiceCents: parsedData.costSummaryCheck?.repairServiceCents ?? 0,
    diagnosticCents: parsedData.costSummaryCheck?.diagnosticCents ?? 0,
    invoiceBackedCents: parsedData.costSummaryCheck?.invoiceBackedCents ?? 0,
    diyPartsCents: parsedData.costSummaryCheck?.diyPartsCents ?? 0,
    processingFeesCents: parsedData.costSummaryCheck?.processingFeesCents ?? 0,
    openDataGapsCount: parsedData.costSummaryCheck?.openDataGapsCount ?? 0,
  };

  const deltas = {
    repair: calculated.repairServiceCents - benchmark.repairServiceCents,
    diag: calculated.diagnosticCents - benchmark.diagnosticCents,
    invoiceBacked: calculated.invoiceBackedCents - benchmark.invoiceBackedCents,
    diy: calculated.diyPartsCents - benchmark.diyPartsCents,
    fees: calculated.processingFeesCents - benchmark.processingFeesCents,
    gaps: parsedData.dataGapsCount - benchmark.openDataGapsCount,
  };

  if (
    !parsedData.costSummaryCheck ||
    parsedData.costSummaryCheck.repairServiceCents === undefined ||
    parsedData.costSummaryCheck.diagnosticCents === undefined ||
    parsedData.costSummaryCheck.diyPartsCents === undefined ||
    parsedData.costSummaryCheck.processingFeesCents === undefined
  ) {
    blockingReasons.push('Missing or incomplete Cost Summary benchmark values in parsed workbook.');
  }

  if (parsedData.records.length === 0) {
    blockingReasons.push('No service records found in parsed workbook.');
  }

  const nonMasterRecords = parsedData.records.filter(
    (r) => !r.sourceSheet || classifySheet(r.sourceSheet) !== 'master'
  );
  if (nonMasterRecords.length > 0) {
    blockingReasons.push(`${nonMasterRecords.length} service records originate from non-master worksheets.`);
  }

  if (!parsedData.reconciliation.isValid) {
    blockingReasons.push(`Structural validation failed: ${parsedData.reconciliation.reasons.join('; ')}`);
  }

  const unresolvedDups = duplicates.filter((d) => !d.choice);
  if (unresolvedDups.length > 0) {
    blockingReasons.push(`${unresolvedDups.length} duplicate conflicts remain unresolved.`);
  }

  if (parsedData.rejectedRows && parsedData.rejectedRows.length > 0) {
    blockingReasons.push(`${parsedData.rejectedRows.length} rejected rows failed candidate schema validation.`);
  }

  const invalidRejections = (parsedData.rejectedRows || []).filter(
    (r) => !r.sheetName || !r.rowNumber || r.rowNumber < 1 || !r.reason
  );
  if (invalidRejections.length > 0) {
    blockingReasons.push(`${invalidRejections.length} rejected rows lack explicit source worksheet, 1-based row number, or rejection reason.`);
  }

  if (parsedData.errors && parsedData.errors.length > 0) {
    blockingReasons.push(`Workbook parsing errors present: ${parsedData.errors.join('; ')}`);
  }
  if (parsedData.reconciliationErrors && parsedData.reconciliationErrors.length > 0) {
    parsedData.reconciliationErrors.forEach((err) => {
      blockingReasons.push(err);
    });
  }
  if (parsedData.warnings && parsedData.warnings.length > 0) {
    blockingReasons.push(`Workbook parsing warnings present: ${parsedData.warnings.join('; ')}`);
  }

  if (deltas.repair !== 0) {
    blockingReasons.push(`Repair / Service spending mismatch: calculated ${calculated.repairServiceCents} cents vs benchmark ${benchmark.repairServiceCents} cents (delta ${deltas.repair} cents).`);
  }
  if (deltas.diag !== 0) {
    blockingReasons.push(`Diagnostic spending mismatch: calculated ${calculated.diagnosticCents} cents vs benchmark ${benchmark.diagnosticCents} cents (delta ${deltas.diag} cents).`);
  }
  if (deltas.invoiceBacked !== 0) {
    blockingReasons.push(`Invoice-backed total mismatch: calculated ${calculated.invoiceBackedCents} cents vs benchmark ${benchmark.invoiceBackedCents} cents (delta ${deltas.invoiceBacked} cents).`);
  }
  if (deltas.diy !== 0) {
    blockingReasons.push(`DIY Parts cost mismatch: calculated ${calculated.diyPartsCents} cents vs benchmark ${benchmark.diyPartsCents} cents (delta ${deltas.diy} cents).`);
  }
  if (deltas.fees !== 0) {
    blockingReasons.push(`Processing fees mismatch: calculated ${calculated.processingFeesCents} cents vs benchmark ${benchmark.processingFeesCents} cents (delta ${deltas.fees} cents).`);
  }

  const refRecords = parsedData.records.filter((r) => r.sourceSheet && classifySheet(r.sourceSheet) === 'reference');
  const refIssues = parsedData.issues.filter((i) => i.sourceSheet && classifySheet(i.sourceSheet) === 'reference');
  const refPlans = parsedData.maintenanceTasks.filter((p) => p.sourceSheet && classifySheet(p.sourceSheet) === 'reference');
  if (refRecords.length > 0 || refIssues.length > 0 || refPlans.length > 0) {
    blockingReasons.push('Excluded reference worksheets contributed domain records.');
  }

  if (deltas.gaps !== 0) {
    blockingReasons.push(`Open data gaps count mismatch: calculated ${parsedData.dataGapsCount} vs benchmark ${benchmark.openDataGapsCount}.`);
  }

  return {
    canCommit: blockingReasons.length === 0,
    blockingReasons,
    calculatedCents: calculated,
    benchmarkCents: benchmark,
    deltasCents: deltas,
  };
}
