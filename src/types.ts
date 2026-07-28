export type ScreenType =
  | 'dashboard'
  | 'vehicles'
  | 'history'
  | 'add-record'
  | 'issues'
  | 'planner'
  | 'costs'
  | 'documents'
  | 'settings'
  | 'blueprint';

// Supported ServiceRecord Statuses
export type ServiceRecordStatus =
  | 'Completed'
  | 'Diagnostic Only'
  | 'Inspection Only'
  | 'Parts Purchased'
  | 'User-Completed'
  | 'Recommended'
  | 'Declined'
  | 'Deferred'
  | 'Planned'
  | 'Monitoring'
  | 'Completion Unverified'
  | 'Mileage Observation'
  | 'Administrative Only';

// Legacy / Screen RecordStatus alias for compatibility
export type RecordStatus = ServiceRecordStatus;

// Confidence Grades (A: Original invoice/receipt, B: CARFAX-only, C: User-confirmed & corroborated, D: User-confirmed only, E: Planned/estimated)
export type ConfidenceGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type DatePrecision = 'Exact' | 'Month' | 'Year' | 'Unknown';
export type MileagePrecision = 'Exact' | 'Estimated' | 'Unknown';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Open' | 'Monitoring' | 'Scheduled' | 'Resolved';
export type MaintenanceRuleStatus = 'Overdue' | 'Due Soon' | 'OK' | 'Upcoming';

// 1. User Interface
export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: 'Owner' | 'Administrator' | 'Viewer';
  preferredCurrency: string;
  preferredUnit: 'miles' | 'km';
  createdAt: string;
}

// 2. Vehicle Interface
export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  vin: string;
  licensePlate: string;
  currentMileage: number;
  engine: string;
  transmission: string;
  fuelType: string;
  color: string;
  oilSpecification: string;
  tireSize: string;
  purchaseDate?: string;
  purchaseMileage?: number;
  isPrimary?: boolean;
  notes?: string;
  isSampleData?: boolean;
  importBatchId?: string;
}

// 3. Part Interface
export interface Part {
  id: string;
  name: string;
  partNumber?: string;
  manufacturer?: string;
  quantity: number;
  unitCost: number; // USD
  totalCost: number; // USD
  warrantyMonths?: number;
  notes?: string;
}

// 4. FluidOrMaterial Interface
export interface FluidOrMaterial {
  id: string;
  name: string;
  specification?: string;
  quantity: number;
  unitOfMeasure: 'Quarts' | 'Gallons' | 'Liters' | 'Ounces' | 'Units';
  unitCost: number; // USD
  totalCost: number; // USD
}

// 5. DiagnosticFault Interface
export interface DiagnosticFault {
  id: string;
  code: string; // e.g. P0300
  system: string;
  description: string;
  severity: IssueSeverity;
  freezeFrameData?: Record<string, string | number>;
}

// 6. ActiveIssue Interface
export interface ActiveIssue {
  id: string;
  vehicleId: string;
  title: string;
  severity: IssueSeverity;
  status: IssueStatus;
  reportedDate: string;
  reportedMileage?: number;
  description: string;
  estimatedCost?: number;
  resolvedDate?: string;
  resolvedRecordId?: string;
  diagnosticFaults?: DiagnosticFault[];
  tags: string[];
  isSampleData?: boolean;
  importBatchId?: string;
  sourceSheet?: string;
  sourceRowNumber?: number;
}

// Backward compatibility alias for Issue
export type Issue = ActiveIssue;

// 7. MaintenancePlan Interface
export interface MaintenancePlan {
  id: string;
  vehicleId: string;
  title: string;
  category: string;
  intervalMiles: number;
  intervalMonths: number;
  dueMileage: number;
  dueDate?: string;
  lastPerformedDate?: string;
  lastPerformedMileage?: number;
  status: MaintenanceRuleStatus;
  estimatedCost: number; // USD
  description: string;
  isSampleData?: boolean;
  importBatchId?: string;
  sourceSheet?: string;
  sourceRowNumber?: number;
}

// Backward compatibility alias for MaintenanceTask
export type MaintenanceTask = MaintenancePlan;

// 8. Attachment Interface
export interface Attachment {
  id: string;
  vehicleId: string;
  serviceRecordId?: string;
  title: string;
  category: 'Invoice' | 'Manual' | 'Insurance' | 'Registration' | 'Inspection' | 'Warranty' | 'Receipt';
  uploadDate: string;
  fileSize: string;
  fileName: string;
  fileType: string;
  pageCount?: number;
  status: 'Verified' | 'Unparsed' | 'Archived';
  isSampleData?: boolean;
  importBatchId?: string;
}

// Backward compatibility alias for DocumentItem
export type DocumentItem = Attachment;

// 9. Provider Interface
export interface Provider {
  id: string;
  name: string;
  type: 'Dealer' | 'Independent Shop' | 'Chain' | 'DIY' | 'Mobile Service' | 'Inspection Station';
  address?: string;
  phone?: string;
  website?: string;
}

// 10. CostBreakdown Interface
export interface CostBreakdown {
  laborCost: number; // USD
  partsCost: number; // USD
  fees: number; // USD
  tax: number; // USD
  processingFee: number; // USD
  discount: number; // USD
  dealerCredit: number; // USD
  finalInvoiceTotal: number; // USD
  actualDocumentedPayment: number; // USD
}

// 11. EvidenceSource Interface
export interface EvidenceSource {
  id: string;
  attachmentId?: string;
  sourceType: 'Invoice' | 'Receipt' | 'Carfax' | 'UserEntry' | 'Inspection' | 'Other';
  evidenceFilename?: string;
  evidencePage?: number;
  confidenceGrade: ConfidenceGrade;
  verificationNeeded: boolean;
  duplicateGroupId?: string;
}

// 12. ServiceRecord Interface
export interface ServiceRecord {
  id: string;
  vehicleId: string;

  // Date & Precision
  serviceDate?: string; // ISO format YYYY-MM-DD
  datePrecision: DatePrecision;

  // Mileage & Precision
  mileageIn?: number;
  mileageOut?: number;
  mileagePrecision: MileagePrecision;

  // Provider & Location
  provider: Provider | string;
  location?: string;
  invoiceNumber?: string;

  // Category & Details
  category: string;
  complaintReason?: string;
  status: ServiceRecordStatus;
  workPerformed: string;
  partsReplaced: Part[];
  partNumbers?: string[];
  fluidsAndMaterials: FluidOrMaterial[];

  // Cost Breakdown (all stored as USD numeric values)
  laborCost: number;
  partsCost: number;
  fees: number;
  tax: number;
  processingFee: number;
  discount: number;
  dealerCredit: number;
  finalInvoiceTotal: number;
  actualDocumentedPayment: number;
  costBreakdown?: CostBreakdown;

  // Evidence & Source
  sourceType: 'Invoice' | 'Receipt' | 'Carfax' | 'UserEntry' | 'Inspection' | 'Other';
  confidenceGrade: ConfidenceGrade;
  evidenceFilename?: string;
  evidencePage?: number;
  duplicateGroupId?: string;
  verificationNeeded: boolean;

  // Notes & Next Service Recommendations
  notes?: string;
  nextServiceMileage?: number;
  nextServiceDate?: string;

  // Convenience & Backward Compatibility Properties
  date?: string; // Fallback to serviceDate
  mileage?: number; // Fallback to mileageIn
  title?: string; // Fallback to workPerformed
  totalCost?: number; // Fallback to finalInvoiceTotal or actualDocumentedPayment
  tags?: string[];
  partsList?: Array<{ name: string; partNumber?: string; cost: number }>;
  receiptAttached?: boolean;
  documentNames?: string[];
  isSampleData?: boolean;
  importBatchId?: string;
  sourceSheet?: string;
  sourceRowNumber?: number;
}

export interface ImportBatchRecord {
  id: string; // e.g. import-1700000000000
  timestamp: string;
  filename: string;
  recordsAdded: number;
  recordsUpdated: number;
  recordsSkipped: number;
  issuesAdded: number;
  plansAdded: number;
  documentsAdded: number;
  snapshotBackup: string; // JSON string of DBData state prior to import
}

export interface AppState {
  vehicles: Vehicle[];
  activeVehicleId: string;
  records: ServiceRecord[];
  issues: ActiveIssue[];
  maintenanceTasks: MaintenancePlan[];
  documents: Attachment[];
  currentUser?: User;
  theme: 'light' | 'dark' | 'system';
  currentScreen: ScreenType;
  unitSystem: 'miles' | 'km';
  currencySymbol: string;
}
