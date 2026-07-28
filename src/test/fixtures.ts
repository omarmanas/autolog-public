import {
  ActiveIssue,
  Attachment,
  MaintenancePlan,
  Provider,
  ServiceRecord,
  Vehicle,
} from '../types';
import * as XLSX from 'xlsx';

export const TEST_PRIMARY_VEHICLE_ID = 'test-vehicle-alpha';
export const TEST_SECONDARY_VEHICLE_ID = 'test-vehicle-beta';
export const TEST_ORPHAN_VEHICLE_ID = 'test-vehicle-unregistered';

export const TEST_PROVIDER: Provider = {
  id: 'test-provider-alpha',
  name: 'Fictional Auto Lab',
  type: 'Independent Shop',
  address: '100 Example Avenue',
};

export const TEST_VEHICLES: Vehicle[] = [
  {
    id: TEST_PRIMARY_VEHICLE_ID,
    make: 'Aurora',
    model: 'Cityline',
    year: 2022,
    trim: 'Touring',
    vin: 'TESTVIN0000000001',
    licensePlate: 'DEMO-123',
    currentMileage: 45000,
    engine: '2.0L Inline-4',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    color: 'Silver',
    oilSpecification: '0W-20',
    tireSize: '215/55R17',
    isPrimary: true,
  },
  {
    id: TEST_SECONDARY_VEHICLE_ID,
    make: 'Nimbus',
    model: 'Trailway',
    year: 2021,
    trim: 'Base',
    vin: 'TESTVIN0000000002',
    licensePlate: 'DEMO-456',
    currentMileage: 30000,
    engine: '2.5L Inline-4',
    transmission: 'Automatic',
    fuelType: 'Gasoline',
    color: 'Blue',
    oilSpecification: '5W-30',
    tireSize: '225/65R17',
  },
];

function createRecord(
  id: string,
  vehicleId: string,
  overrides: Partial<ServiceRecord> = {}
): ServiceRecord {
  return {
    id,
    vehicleId,
    serviceDate: '2025-01-15',
    datePrecision: 'Exact',
    mileageIn: 40000,
    mileagePrecision: 'Exact',
    provider: TEST_PROVIDER,
    invoiceNumber: `TEST-${id}`,
    category: 'Maintenance',
    status: 'Completed',
    workPerformed: 'Routine inspection',
    partsReplaced: [],
    fluidsAndMaterials: [],
    laborCost: 40,
    partsCost: 10,
    fees: 0,
    tax: 0,
    processingFee: 0,
    discount: 0,
    dealerCredit: 0,
    finalInvoiceTotal: 50,
    actualDocumentedPayment: 50,
    sourceType: 'Invoice',
    confidenceGrade: 'A',
    verificationNeeded: false,
    totalCost: 50,
    tags: ['test-fixture'],
    ...overrides,
  };
}

export const TEST_RECORDS: ServiceRecord[] = [
  createRecord('test-record-a', TEST_PRIMARY_VEHICLE_ID),
  createRecord('test-record-b', TEST_PRIMARY_VEHICLE_ID, {
    serviceDate: '2025-03-20',
    mileageIn: 42000,
    category: 'Diagnostics',
    status: 'Diagnostic Only',
    workPerformed: 'Generic system diagnosis',
    laborCost: 25,
    partsCost: 0,
    finalInvoiceTotal: 25,
    actualDocumentedPayment: 25,
    totalCost: 25,
  }),
  createRecord('test-record-c', TEST_SECONDARY_VEHICLE_ID, {
    serviceDate: '2024-09-10',
    mileageIn: 28000,
    laborCost: 0,
    partsCost: 15,
    finalInvoiceTotal: 15,
    actualDocumentedPayment: 15,
    totalCost: 15,
  }),
  createRecord('test-record-orphan', TEST_ORPHAN_VEHICLE_ID, {
    serviceDate: '2023-06-01',
    mileageIn: undefined,
    mileagePrecision: 'Unknown',
    finalInvoiceTotal: 75,
    actualDocumentedPayment: 75,
    totalCost: 75,
  }),
];

export const TEST_ISSUES: ActiveIssue[] = [
  {
    id: 'test-issue-a',
    vehicleId: TEST_PRIMARY_VEHICLE_ID,
    title: 'Intermittent dashboard indicator',
    severity: 'Low',
    status: 'Monitoring',
    reportedDate: '2025-02-01',
    reportedMileage: 41000,
    description: 'Fictional issue used for automated tests.',
    tags: ['test-fixture'],
  },
  {
    id: 'test-issue-b',
    vehicleId: TEST_SECONDARY_VEHICLE_ID,
    title: 'Tire pressure check',
    severity: 'Medium',
    status: 'Open',
    reportedDate: '2025-02-10',
    description: 'Fictional issue without reported mileage.',
    tags: ['test-fixture'],
  },
];

export const TEST_MAINTENANCE_TASKS: MaintenancePlan[] = [
  {
    id: 'test-plan-a',
    vehicleId: TEST_PRIMARY_VEHICLE_ID,
    title: 'Routine fluid inspection',
    category: 'Maintenance',
    intervalMiles: 5000,
    intervalMonths: 6,
    dueMileage: 50000,
    dueDate: '2026-01-15',
    status: 'Upcoming',
    estimatedCost: 0,
    description: 'Fictional recurring maintenance task.',
  },
  {
    id: 'test-plan-b',
    vehicleId: TEST_SECONDARY_VEHICLE_ID,
    title: 'Tire rotation',
    category: 'Tires',
    intervalMiles: 6000,
    intervalMonths: 6,
    dueMileage: 36000,
    status: 'OK',
    estimatedCost: 20,
    description: 'Fictional tire maintenance task.',
  },
];

export const TEST_DOCUMENTS: Attachment[] = [
  {
    id: 'test-document-a',
    vehicleId: TEST_PRIMARY_VEHICLE_ID,
    serviceRecordId: 'test-record-a',
    title: 'Fictional service receipt',
    category: 'Receipt',
    uploadDate: '2025-01-15',
    fileSize: '10 KB',
    fileName: 'fictional-service-receipt.pdf',
    fileType: 'application/pdf',
    status: 'Verified',
  },
  {
    id: 'test-document-b',
    vehicleId: TEST_SECONDARY_VEHICLE_ID,
    title: 'Fictional vehicle manual',
    category: 'Manual',
    uploadDate: '2024-01-01',
    fileSize: '20 KB',
    fileName: 'fictional-vehicle-manual.pdf',
    fileType: 'application/pdf',
    status: 'Archived',
  },
];

export function createFictionalImportWorkbook(): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const addSheet = (name: string, rows: unknown[][]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  };

  addSheet('Master Service History', [
    ['AutoLog fictional import fixture'],
    ['Generated only for automated tests'],
    [],
    [
      'Record ID',
      'Service Date',
      'Mileage In',
      'Provider',
      'Category',
      'Status',
      'Work Performed',
      'Labor Cost',
      'Parts Cost',
      'Processing Fee',
      'Final Invoice Total',
      'Actual Documented Payment',
    ],
    ['SVC001', '2025-01-10', 10000, 'Fictional Auto Lab', 'Maintenance', 'Completed', 'Routine inspection', 40, 10, 0, 50, 50],
    ['SVC002', '2025-02-12', 0, 'Example Diagnostic Center', 'Diagnostics', 'Diagnostic Only', 'Generic diagnostic scan', 25, 0, 0, 25, 25],
    ['SVC003', '2025-03-14', '', 'Home workshop', 'DIY', 'User-Completed', 'Replace fictional filter', 0, 15, 0, 15, 15],
    ['SVC004', '', '', 'Fictional Auto Lab', 'Inspection', 'Completion Unverified', 'Unverified historical note', 0, 0, 0, 99, 99],
  ]);

  addSheet('Active Issues', [
    ['Fictional issues'],
    [],
    [],
    ['Issue ID', 'Issue', 'System', 'Status', 'Priority', 'Next Action', 'Reported Date', 'Reported Mileage'],
    ['ISS001', 'Inspect indicator lamp', 'Electrical', 'Monitoring', 'Low', 'Observe during next drive', '2025-04-01', 11000],
    ['ISS002', 'Check tire pressure', 'Tires', 'Open', 'Medium', 'Inspect all tires', '2025-04-02', ''],
  ]);

  addSheet('Maintenance Planner', [
    ['Fictional plans'],
    [],
    [],
    ['Plan ID', 'Item', 'Last documented date', 'Last mileage', 'Interval / trigger', 'Status', 'Interval Miles', 'Interval Months', 'Estimated Cost'],
    ['PLAN001', 'Routine fluid check', '2025-01-10', 10000, 'Every six months', 'Upcoming', 5000, 6, 0],
    ['PLAN002', 'Rotate tires', '2025-02-12', 10000, 'At mileage interval', 'OK', 6000, 6, 20],
  ]);

  addSheet('Cost Summary', [
    ['Record ID', 'Cost classification', 'Amount', 'Notes'],
    ['SVC001', 'Repair / Service', 50, 'Fictional repair allocation'],
    ['SVC002', 'Diagnostic', 25, 'Fictional diagnostic allocation'],
    ['SVC003', 'DIY Parts', 15, 'Fictional parts allocation'],
    [],
    ['Cost Category', 'Amount'],
    ['Repair / Service Cost', 50],
    ['Diagnostic Cost', 25],
    ['DIY Parts Purchases', 15],
    ['Processing Fees', 0],
    ['Open Data Gaps', 1],
  ]);

  addSheet('Data Gaps & Conflicts', [
    ['Fictional reference data'],
    [],
    [],
    ['Gap ID', 'Topic', 'Conflict / missing information', 'Current workbook treatment', 'Status', 'Evidence needed', 'Priority'],
    ['GAP001', 'Date precision', 'Exact day unavailable', 'Stored as month precision', 'Open', 'Service receipt', 'Low'],
  ]);

  addSheet('Instructions & Legend', [
    ['This reference-only sheet must never create domain records.'],
  ]);

  const output = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return output instanceof Uint8Array ? output : new Uint8Array(output);
}
