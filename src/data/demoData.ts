import {
  ActiveIssue,
  Attachment,
  MaintenancePlan,
  ServiceRecord,
  Vehicle,
} from '../types';

export const DEMO_VEHICLE_ID = 'demo-vehicle-aurora-2024';

const vehicle: Vehicle = {
  id: DEMO_VEHICLE_ID,
  make: 'Aurora',
  model: 'Cityline',
  year: 2024,
  trim: 'Demo Edition',
  vin: 'DEMO-NOT-A-REAL-VIN',
  licensePlate: 'DEMO-ONLY',
  currentMileage: 12500,
  engine: '2.0L Fictional I4',
  transmission: 'Automatic',
  fuelType: 'Gasoline',
  color: 'Silver',
  oilSpecification: '0W-20',
  tireSize: '215/55R17',
  purchaseMileage: 10000,
  isPrimary: true,
  isSampleData: true,
  notes: 'Fictional demonstration vehicle. Not associated with a real owner.',
};

const baseRecord = {
  vehicleId: DEMO_VEHICLE_ID,
  datePrecision: 'Exact' as const,
  mileagePrecision: 'Exact' as const,
  provider: 'Fictional Auto Lab',
  partsReplaced: [],
  fluidsAndMaterials: [],
  laborCost: 0,
  partsCost: 0,
  fees: 0,
  tax: 0,
  processingFee: 0,
  discount: 0,
  dealerCredit: 0,
  finalInvoiceTotal: 0,
  actualDocumentedPayment: 0,
  sourceType: 'UserEntry' as const,
  confidenceGrade: 'D' as const,
  verificationNeeded: false,
  isSampleData: true,
};

const records: ServiceRecord[] = [
  {
    ...baseRecord,
    id: 'demo-record-oil-001',
    serviceDate: '2025-01-15',
    mileageIn: 10500,
    mileageOut: 10500,
    category: 'Oil & Filter',
    status: 'Completed',
    workPerformed: 'Demonstration oil and filter service',
    partsReplaced: [],
    fluidsAndMaterials: [],
    partsCost: 28,
    laborCost: 20,
    finalInvoiceTotal: 48,
    actualDocumentedPayment: 48,
    totalCost: 48,
  },
  {
    ...baseRecord,
    id: 'demo-record-inspection-002',
    serviceDate: '2025-03-10',
    mileageIn: 11500,
    mileageOut: 11500,
    category: 'Inspection',
    status: 'Inspection Only',
    workPerformed: 'Fictional seasonal safety inspection',
    partsReplaced: [],
    fluidsAndMaterials: [],
    finalInvoiceTotal: 20,
    actualDocumentedPayment: 20,
    totalCost: 20,
  },
  {
    ...baseRecord,
    id: 'demo-record-tires-003',
    serviceDate: '2025-05-20',
    mileageIn: 12300,
    mileageOut: 12300,
    category: 'Tires',
    status: 'User-Completed',
    workPerformed: 'Demonstration tire pressure and tread check',
    partsReplaced: [],
    fluidsAndMaterials: [],
    totalCost: 0,
  },
];

const issues: ActiveIssue[] = [
  {
    id: 'demo-issue-wiper-001',
    vehicleId: DEMO_VEHICLE_ID,
    title: 'Demo: inspect rear wiper',
    severity: 'Low',
    status: 'Open',
    reportedDate: '2025-05-22',
    reportedMileage: 12400,
    description: 'Fictional low-priority issue for demonstrating issue tracking.',
    tags: ['demo', 'visibility'],
    isSampleData: true,
  },
  {
    id: 'demo-issue-noise-002',
    vehicleId: DEMO_VEHICLE_ID,
    title: 'Demo: monitor cabin rattle',
    severity: 'Low',
    status: 'Monitoring',
    reportedDate: '2025-05-25',
    reportedMileage: 12450,
    description: 'Fictional monitoring item with no safety impact.',
    tags: ['demo', 'interior'],
    isSampleData: true,
  },
];

const maintenanceTasks: MaintenancePlan[] = [
  {
    id: 'demo-plan-oil-001',
    vehicleId: DEMO_VEHICLE_ID,
    title: 'Demo oil service',
    category: 'Oil & Filter',
    intervalMiles: 5000,
    intervalMonths: 6,
    dueMileage: 15500,
    dueDate: '2025-07-15',
    lastPerformedDate: '2025-01-15',
    lastPerformedMileage: 10500,
    status: 'Upcoming',
    estimatedCost: 50,
    description: 'Fictional recurring maintenance plan.',
    isSampleData: true,
  },
  {
    id: 'demo-plan-tires-002',
    vehicleId: DEMO_VEHICLE_ID,
    title: 'Demo tire rotation',
    category: 'Tires',
    intervalMiles: 7500,
    intervalMonths: 12,
    dueMileage: 18000,
    dueDate: '2026-01-15',
    status: 'Upcoming',
    estimatedCost: 30,
    description: 'Fictional tire rotation reminder.',
    isSampleData: true,
  },
];

const documents: Attachment[] = [
  {
    id: 'demo-document-guide-001',
    vehicleId: DEMO_VEHICLE_ID,
    title: 'Demo maintenance checklist',
    category: 'Manual',
    uploadDate: '2025-01-01',
    fileSize: '0 KB',
    fileName: 'demo-maintenance-checklist.pdf',
    fileType: 'application/pdf',
    pageCount: 1,
    status: 'Archived',
    isSampleData: true,
  },
];

export const DEMO_DATA = {
  vehicles: [vehicle],
  records,
  issues,
  maintenanceTasks,
  documents,
} satisfies {
  vehicles: Vehicle[];
  records: ServiceRecord[];
  issues: ActiveIssue[];
  maintenanceTasks: MaintenancePlan[];
  documents: Attachment[];
};

export const DEMO_ID_MANIFEST = {
  vehicles: DEMO_DATA.vehicles.map(({ id }) => id),
  records: DEMO_DATA.records.map(({ id }) => id),
  issues: DEMO_DATA.issues.map(({ id }) => id),
  maintenanceTasks: DEMO_DATA.maintenanceTasks.map(({ id }) => id),
  documents: DEMO_DATA.documents.map(({ id }) => id),
} as const;

type DemoStore = keyof typeof DEMO_DATA;

export function isExpectedDemoEntity(
  storeName: DemoStore,
  entity: { id: string }
): boolean {
  const expected = DEMO_DATA[storeName].find((candidate) => candidate.id === entity.id);
  return Boolean(expected) && JSON.stringify(entity) === JSON.stringify(expected);
}

export function containsRecognizedDemoManifest(data: {
  [K in DemoStore]: Array<{ id: string }>;
}): boolean {
  return (Object.keys(DEMO_ID_MANIFEST) as DemoStore[]).every((storeName) => {
    const byId = new Map(data[storeName].map((entity) => [entity.id, entity]));
    return DEMO_ID_MANIFEST[storeName].every((id) => {
      const entity = byId.get(id);
      return Boolean(entity) && isExpectedDemoEntity(storeName, entity);
    });
  });
}
