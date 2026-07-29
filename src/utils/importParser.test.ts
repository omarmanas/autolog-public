import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  createFictionalImportWorkbook,
  TEST_RECORDS,
} from '../test/fixtures';
import {
  calculateReconciliationCosts,
  classifySheet,
  evaluateReconciliationGate,
  findDataGapsHeaderRow,
  findDuplicates,
  findHeaderRow,
  parseCostSummarySheet,
  parseImportFile,
  ParsedWorkbookData,
  SERVICE_HEADER_SIGNATURE,
} from './importParser';

const VEHICLE_ID = 'test-import-vehicle';

function parseFixture() {
  const bytes = createFictionalImportWorkbook();
  return parseImportFile(bytes.buffer, 'fictional-maintenance.xlsx', VEHICLE_ID);
}

function createServiceWorkbook(
  rows: unknown[][],
  bookType: XLSX.BookType = 'xlsx'
): Uint8Array {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(rows),
    'Master Service History'
  );
  const output = XLSX.write(workbook, { type: 'array', bookType });
  return output instanceof Uint8Array ? output : new Uint8Array(output);
}

function createEmptyParsedData(): ParsedWorkbookData {
  return {
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
}

describe('generic import parser', () => {
  it('classifies canonical and reference-only sheets', () => {
    expect(classifySheet('Master Service History')).toBe('master');
    expect(classifySheet('Active Issues')).toBe('issues');
    expect(classifySheet('Maintenance Planner')).toBe('planner');
    expect(classifySheet('Instructions & Legend')).toBe('reference');
    expect(classifySheet('Cost Summary')).toBe('reference');
  });

  it('detects a service header after arbitrary preamble rows', () => {
    const matrix = [
      ['Fictional title'],
      [],
      ['Notes'],
      ['Record ID', 'Service Date', 'Provider', 'Category', 'Status', 'Work Performed'],
    ];

    expect(findHeaderRow(matrix, SERVICE_HEADER_SIGNATURE)?.headerRowIndex).toBe(3);
  });

  it('parses fictional records, issues, plans, and reference sheets', () => {
    const parsed = parseFixture();

    expect(parsed.records).toHaveLength(4);
    expect(parsed.issues).toHaveLength(2);
    expect(parsed.maintenanceTasks).toHaveLength(2);
    expect(parsed.dataGaps).toHaveLength(1);
    expect(parsed.referenceOnlySheets).toEqual(
      expect.arrayContaining([
        'Cost Summary',
        'Data Gaps & Conflicts',
        'Instructions & Legend',
      ])
    );
    expect(parsed.records.every((record) => record.vehicleId === VEHICLE_ID)).toBe(true);
    expect(parsed.records.every((record) => record.sourceSheet === 'Master Service History')).toBe(true);
    expect(parsed.rejectedRows).toEqual([]);
    expect(parsed.errors).toEqual([]);
  });

  it('preserves service dates across SheetJS date cell representations', () => {
    const rows: unknown[][] = [
      ['AutoLog date compatibility fixture'],
      ['Native and textual date representations'],
      [],
      [
        'Record ID',
        'Service Date',
        'Provider',
        'Category',
        'Status',
        'Work Performed',
      ],
      ['DATE-SERIAL', 45658, 'Date Lab', 'Maintenance', 'Completed', 'Excel serial'],
      [
        'DATE-NATIVE',
        new Date(2025, 2, 9, 12),
        'Date Lab',
        'Maintenance',
        'Completed',
        'Native Date cell',
      ],
      ['DATE-ISO', '2025-06-15', 'Date Lab', 'Maintenance', 'Completed', 'ISO date'],
      ['DATE-US', '07/04/2025', 'Date Lab', 'Maintenance', 'Completed', 'US date'],
      [
        'DATE-UTC-MIDNIGHT',
        '2025-03-09T00:30:00.000Z',
        'Date Lab',
        'Maintenance',
        'Completed',
        'Near UTC midnight',
      ],
      [
        'DATE-DST-FALL',
        new Date(2025, 10, 2, 12),
        'Date Lab',
        'Maintenance',
        'Completed',
        'DST transition',
      ],
    ];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet.B5.z = 'yyyy-mm-dd';
    XLSX.utils.book_append_sheet(workbook, sheet, 'Master Service History');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const reread = XLSX.read(bytes, { type: 'array', cellDates: true });
    const parsed = parseImportFile(bytes, 'date-compatibility.xlsx', VEHICLE_ID);

    expect(reread.Sheets['Master Service History'].B5.v).toBeInstanceOf(Date);
    expect(
      Object.fromEntries(
        parsed.records.map((record) => [record.id, record.serviceDate])
      )
    ).toEqual({
      'DATE-SERIAL': '2025-01-01',
      'DATE-NATIVE': '2025-03-09',
      'DATE-ISO': '2025-06-15',
      'DATE-US': '2025-07-04',
      'DATE-UTC-MIDNIGHT': '2025-03-09',
      'DATE-DST-FALL': '2025-11-02',
    });
    expect(parsed.errors).toEqual([]);
  });

  it('preserves canonical XLS import behavior', () => {
    const bytes = createServiceWorkbook(
      [
        ['Legacy workbook preamble'],
        [],
        [],
        [
          'Record ID',
          'Service Date',
          'Provider',
          'Category',
          'Status',
          'Work Performed',
        ],
        [
          'XLS001',
          '2025-05-20',
          'Legacy Format Shop',
          'Maintenance',
          'Completed',
          'Legacy workbook import',
        ],
      ],
      'xls'
    );

    const parsed = parseImportFile(bytes, 'legacy-maintenance.xls', VEHICLE_ID);

    expect(parsed.records).toEqual([
      expect.objectContaining({
        id: 'XLS001',
        serviceDate: '2025-05-20',
        sourceSheet: 'Master Service History',
        sourceRowNumber: 5,
      }),
    ]);
    expect(parsed.errors).toEqual([]);
  });

  it('documents internal SheetJS CSV parsing without implying product support', () => {
    const csv = [
      'Record ID,Service Date,Provider,Category,Status,Work Performed',
      'CSV001,2025-08-12,CSV Service Shop,Maintenance,Completed,CSV import',
    ].join('\n');

    const parsed = parseImportFile(csv, 'maintenance.csv', VEHICLE_ID);

    expect(parsed.sheetsFound).toEqual(['Sheet1']);
    expect(parsed.referenceOnlySheets).toEqual(['Sheet1']);
    expect(parsed.records).toEqual([]);
    expect(parsed.errors).toEqual([]);
  });

  it('fails safely for malformed, empty, and unsupported workbooks', () => {
    const malformed = parseImportFile(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
      'malformed.xlsx',
      VEHICLE_ID
    );
    const emptyWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      emptyWorkbook,
      XLSX.utils.aoa_to_sheet([]),
      'Sheet1'
    );
    const emptyBytes = XLSX.write(emptyWorkbook, {
      type: 'array',
      bookType: 'xlsx',
    });
    const empty = parseImportFile(emptyBytes, 'empty.xlsx', VEHICLE_ID);
    const unsupportedBytes = createServiceWorkbook([
      ['Unexpected heading'],
      ['No canonical header exists here'],
    ]);
    const unsupported = parseImportFile(
      unsupportedBytes,
      'unsupported.xlsx',
      VEHICLE_ID
    );

    expect(malformed.records).toEqual([]);
    expect(malformed.errors[0]).toMatch(/^Failed to parse file:/);
    expect(malformed.reconciliation.isValid).toBe(false);
    expect(empty.records).toEqual([]);
    expect(empty.errors).toEqual([]);
    expect(unsupported.records).toEqual([]);
    expect(unsupported.errors).toContain(
      'Header detection failed for routed worksheet "Master Service History".'
    );
    expect(unsupported.reconciliation.isValid).toBe(false);
  });

  it('preserves numeric zero and undefined optional mileage', () => {
    const parsed = parseFixture();

    expect(parsed.records.find((record) => record.id === 'SVC002')?.mileageIn).toBe(0);
    expect(parsed.records.find((record) => record.id === 'SVC003')?.mileageIn).toBeUndefined();
  });

  it('preserves Completion Unverified and excludes its cost from reconciliation', () => {
    const parsed = parseFixture();
    const unverified = parsed.records.find((record) => record.id === 'SVC004');
    const costs = calculateReconciliationCosts(
      parsed.records,
      parsed.issues,
      parsed.costSummaryCheck?.ledgerItems
    );

    expect(unverified?.status).toBe('Completion Unverified');
    expect(costs.invoiceBackedCents).toBe(7500);
    expect(costs.diyPartsCents).toBe(1500);
  });

  it('derives reconciliation benchmarks from workbook contents', () => {
    const parsed = parseFixture();
    const gate = evaluateReconciliationGate(parsed);

    expect(parsed.costSummaryCheck).toMatchObject({
      repairServiceCents: 5000,
      diagnosticCents: 2500,
      invoiceBackedCents: 7500,
      diyPartsCents: 1500,
      processingFeesCents: 0,
      openDataGapsCount: 1,
    });
    expect(gate.canCommit).toBe(true);
    expect(gate.deltasCents).toEqual({
      repair: 0,
      diag: 0,
      invoiceBacked: 0,
      diy: 0,
      fees: 0,
      gaps: 0,
    });
  });

  it('blocks commit for a generic declared-versus-calculated discrepancy', () => {
    const parsed = parseFixture();
    if (!parsed.costSummaryCheck) throw new Error('Expected cost summary');
    parsed.costSummaryCheck = {
      ...parsed.costSummaryCheck,
      repairServiceCents: parsed.costSummaryCheck.repairServiceCents + 1,
      invoiceBackedCents: parsed.costSummaryCheck.invoiceBackedCents + 1,
    };

    const gate = evaluateReconciliationGate(parsed);

    expect(gate.canCommit).toBe(false);
    expect(gate.blockingReasons.some((reason) => reason.includes('mismatch'))).toBe(true);
  });

  it('fails closed for missing benchmark labels', () => {
    const parsed = createEmptyParsedData();
    parseCostSummarySheet(
      [
        ['Record ID', 'Cost classification', 'Amount'],
        ['SVC001', 'Repair / Service', 10],
      ],
      parsed
    );
    parsed.records = [structuredClone(TEST_RECORDS[0])];
    parsed.records[0].sourceSheet = 'Master Service History';

    expect(evaluateReconciliationGate(parsed).canCommit).toBe(false);
    expect(parsed.reconciliationErrors).toContain(
      'Required benchmark cost label missing, duplicated, ambiguous, or non-numeric in Cost Summary table.'
    );
  });

  it('detects missing and ambiguous data-gap headers', () => {
    const header = [
      'Gap ID',
      'Topic',
      'Conflict / missing information',
      'Current workbook treatment',
      'Status',
      'Evidence needed',
      'Priority',
    ];

    expect(findDataGapsHeaderRow([['No matching header']])).toBe('missing');
    expect(findDataGapsHeaderRow([header, header])).toBe('ambiguous');
  });

  it('detects duplicate IDs, invoices, and near-identical date/mileage records', () => {
    const existing = structuredClone(TEST_RECORDS);
    const byId = { ...existing[0] };
    const byInvoice = {
      ...existing[1],
      id: 'different-id',
      invoiceNumber: existing[0].invoiceNumber,
    };
    const byDateMileage = {
      ...existing[1],
      id: 'another-id',
      invoiceNumber: '',
      serviceDate: existing[0].serviceDate,
      mileageIn: (existing[0].mileageIn || 0) + 5,
    };

    expect(findDuplicates([byId, byInvoice, byDateMileage], existing)).toHaveLength(3);
  });

  it('parses JSON exports without workbook-specific constraints', () => {
    const json = JSON.stringify({
      records: [TEST_RECORDS[0]],
      issues: [],
      maintenanceTasks: [],
      documents: [],
    });
    const parsed = parseImportFile(json, 'fictional-export.json', VEHICLE_ID);

    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].vehicleId).toBe(VEHICLE_ID);
    expect(parsed.reconciliation.isValid).toBe(true);
  });

  it('rejects malformed candidate rows with provenance', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Record ID', 'Service Date', 'Provider', 'Category', 'Status', 'Work Performed'],
        ['', '2025-01-01', 'Fictional Auto Lab', 'Maintenance', 'Completed', 'Missing ID'],
      ]),
      'Master Service History'
    );
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const parsed = parseImportFile(bytes, 'malformed.xlsx', VEHICLE_ID);

    expect(parsed.rejectedRows).toEqual([
      expect.objectContaining({
        sheetName: 'Master Service History',
        rowNumber: 2,
        reason: 'Missing Record ID',
      }),
    ]);
    expect(evaluateReconciliationGate(parsed).canCommit).toBe(false);
  });
});
