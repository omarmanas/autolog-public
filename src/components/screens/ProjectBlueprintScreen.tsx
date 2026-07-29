import React, { useState } from 'react';
import { APP_VERSION_LABEL } from '../../appMetadata';
import { Card } from '../common/Card';
import {
  BookOpenCheck,
  Layers,
  Database,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Code2,
  Cpu,
  FileText,
  DollarSign,
  Lock,
  Server,
  Terminal,
} from 'lucide-react';

export const ProjectBlueprintScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scope' | 'schema' | 'dataLayerSpec' | 'grades' | 'roadmap' | 'risks'>('dataLayerSpec');

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Hero Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono text-[10px] font-bold uppercase tracking-wider">
            PRODUCT BLUEPRINT & SPECIFICATION
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs text-slate-400 font-mono">
            {APP_VERSION_LABEL} Architecture
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <BookOpenCheck className="w-8 h-8 text-blue-500" />
          <span>AutoLog Architectural Master Blueprint</span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
          Comprehensive functional blueprint detailing product boundaries, data layer technical specifications, TypeScript models, verification confidence grading, MVP capabilities, and risk matrix.
        </p>

        {/* Tab Switcher */}
        <div className="pt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('dataLayerSpec')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'dataLayerSpec'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Data Layer Technical Spec</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'schema'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>12 TypeScript Interfaces</span>
          </button>

          <button
            onClick={() => setActiveTab('scope')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'scope'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Scope & Screen Map</span>
          </button>

          <button
            onClick={() => setActiveTab('grades')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'grades'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Grades & Statuses</span>
          </button>

          <button
            onClick={() => setActiveTab('roadmap')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'roadmap'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>MVP & Roadmap</span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'risks'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Assumptions & Risks</span>
          </button>
        </div>
      </div>

      {/* Tab: Data Layer Technical Spec */}
      {activeTab === 'dataLayerSpec' && (
        <div className="space-y-6">
          {/* Data Layer Principles Card */}
          <Card className="blueprint-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Data Layer Technical Specification & Rules</span>
              </h2>
              <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold border border-amber-500/20">
                In-Memory Repository Active (Firebase Deferred)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <Card variant="raised" className="blueprint-info-card space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Monetary Values</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  All money is stored as numeric USD values (<code className="font-mono text-blue-600 dark:text-blue-400">number</code>). Invoice totals, actual payments, processing fees, labor, parts, tax, credits, and estimates are strictly separated in accounting.
                </p>
              </Card>

              <Card variant="raised" className="blueprint-info-card space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>ISO Dates & Miles</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Dates are stored in ISO format (<code className="font-mono text-blue-600 dark:text-blue-400">YYYY-MM-DD</code>). Odometer values are stored in miles as integers/floats. Records with unknown dates or mileage are fully supported via precision flags.
                </p>
              </Card>

              <Card variant="raised" className="blueprint-info-card space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Completion Integrity Rule</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Recommended, Planned, or Declined service entries are NEVER treated as completed maintenance. They maintain explicit status badges and separate status workflows.
                </p>
              </Card>
            </div>
          </Card>

          {/* ServiceRecord Specification Card */}
          <Card className="blueprint-card space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>ServiceRecord Specifications & Supported Fields</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 space-y-2">
                <span className="text-blue-400 font-bold block text-sm">Core Identifiers & Metrics</span>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li><span className="text-slate-400">id:</span> unique ID string</li>
                  <li><span className="text-slate-400">vehicleId:</span> vehicle ID string</li>
                  <li><span className="text-slate-400">serviceDate?:</span> string (ISO YYYY-MM-DD)</li>
                  <li><span className="text-slate-400">datePrecision:</span> 'Exact' | 'Month' | 'Year' | 'Unknown'</li>
                  <li><span className="text-slate-400">mileageIn?:</span> number (miles)</li>
                  <li><span className="text-slate-400">mileageOut?:</span> number (miles)</li>
                  <li><span className="text-slate-400">mileagePrecision:</span> 'Exact' | 'Estimated' | 'Unknown'</li>
                  <li><span className="text-slate-400">provider:</span> Provider object or string</li>
                  <li><span className="text-slate-400">location?:</span> string</li>
                  <li><span className="text-slate-400">invoiceNumber?:</span> string (Repair Order #)</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 space-y-2">
                <span className="text-emerald-400 font-bold block text-sm">Financial Accounting Fields (USD)</span>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li><span className="text-slate-400">laborCost:</span> number</li>
                  <li><span className="text-slate-400">partsCost:</span> number</li>
                  <li><span className="text-slate-400">fees:</span> number</li>
                  <li><span className="text-slate-400">tax:</span> number</li>
                  <li><span className="text-slate-400">processingFee:</span> number</li>
                  <li><span className="text-slate-400">discount:</span> number</li>
                  <li><span className="text-slate-400">dealerCredit:</span> number</li>
                  <li><span className="text-slate-400">finalInvoiceTotal:</span> number</li>
                  <li><span className="text-slate-400">actualDocumentedPayment:</span> number</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold block text-sm">Work Details & Items Replaced</span>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li><span className="text-slate-400">category:</span> string</li>
                  <li><span className="text-slate-400">complaintReason?:</span> string</li>
                  <li><span className="text-slate-400">workPerformed:</span> string</li>
                  <li><span className="text-slate-400">partsReplaced:</span> Part[]</li>
                  <li><span className="text-slate-400">partNumbers?:</span> string[]</li>
                  <li><span className="text-slate-400">fluidsAndMaterials:</span> FluidOrMaterial[]</li>
                  <li><span className="text-slate-400">notes?:</span> string</li>
                  <li><span className="text-slate-400">nextServiceMileage?:</span> number</li>
                  <li><span className="text-slate-400">nextServiceDate?:</span> string</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 text-slate-200 border border-slate-800 space-y-2">
                <span className="text-indigo-400 font-bold block text-sm">Verification, Source & Duplicate Grouping</span>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li><span className="text-slate-400">sourceType:</span> 'Invoice' | 'Receipt' | 'Carfax' | 'UserEntry' | 'Inspection'</li>
                  <li><span className="text-slate-400">confidenceGrade:</span> 'A' | 'B' | 'C' | 'D' | 'E'</li>
                  <li><span className="text-slate-400">evidenceFilename?:</span> string</li>
                  <li><span className="text-slate-400">evidencePage?:</span> number</li>
                  <li><span className="text-slate-400">duplicateGroupId?:</span> string (links multiple docs to same episode)</li>
                  <li><span className="text-slate-400">verificationNeeded:</span> boolean</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Supported Statuses & Grades List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="blueprint-card blueprint-card--compact space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>13 Supported ServiceRecord Statuses</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
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
                ].map((status, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>{status}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="blueprint-card blueprint-card--compact space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>5 Confidence Grades (A through E)</span>
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { g: 'A', text: 'Original invoice, repair order, official inspection or receipt' },
                  { g: 'B', text: 'CARFAX-only record' },
                  { g: 'C', text: 'User-confirmed and partially corroborated' },
                  { g: 'D', text: 'User-confirmed only' },
                  { g: 'E', text: 'Planned, estimated or unresolved' },
                ].map((item, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-xs">{item.g}</span>
                    <span className="text-slate-700 dark:text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: 12 TypeScript Interfaces */}
      {activeTab === 'schema' && (
        <Card className="blueprint-card space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>12 Complete TypeScript Model Interfaces</span>
          </h2>

          <div className="space-y-4 text-xs font-mono">
            {[
              { title: '1. User', code: `export interface User {\n  id: string;\n  email: string;\n  displayName?: string;\n  role: 'Owner' | 'Administrator' | 'Viewer';\n  preferredCurrency: string;\n  preferredUnit: 'miles' | 'km';\n  createdAt: string;\n}` },
              { title: '2. Vehicle', code: `export interface Vehicle {\n  id: string;\n  make: string;\n  model: string;\n  year: number;\n  trim: string;\n  vin: string;\n  licensePlate: string;\n  currentMileage: number;\n  engine: string;\n  transmission: string;\n  fuelType: string;\n  color: string;\n  oilSpecification: string;\n  tireSize: string;\n  purchaseDate?: string;\n  purchaseMileage?: number;\n  isPrimary?: boolean;\n  notes?: string;\n}` },
              { title: '3. Part', code: `export interface Part {\n  id: string;\n  name: string;\n  partNumber?: string;\n  manufacturer?: string;\n  quantity: number;\n  unitCost: number;\n  totalCost: number;\n  warrantyMonths?: number;\n  notes?: string;\n}` },
              { title: '4. FluidOrMaterial', code: `export interface FluidOrMaterial {\n  id: string;\n  name: string;\n  specification?: string;\n  quantity: number;\n  unitOfMeasure: 'Quarts' | 'Gallons' | 'Liters' | 'Ounces' | 'Units';\n  unitCost: number;\n  totalCost: number;\n}` },
              { title: '5. DiagnosticFault', code: `export interface DiagnosticFault {\n  id: string;\n  code: string;\n  system: string;\n  description: string;\n  severity: 'Low' | 'Medium' | 'High' | 'Critical';\n  freezeFrameData?: Record<string, string | number>;\n}` },
              { title: '6. ActiveIssue', code: `export interface ActiveIssue {\n  id: string;\n  vehicleId: string;\n  title: string;\n  severity: 'Low' | 'Medium' | 'High' | 'Critical';\n  status: 'Open' | 'Monitoring' | 'Scheduled' | 'Resolved';\n  reportedDate: string;\n  reportedMileage?: number;\n  description: string;\n  estimatedCost?: number;\n  resolvedDate?: string;\n  resolvedRecordId?: string;\n  diagnosticFaults?: DiagnosticFault[];\n  tags: string[];\n}` },
              { title: '7. MaintenancePlan', code: `export interface MaintenancePlan {\n  id: string;\n  vehicleId: string;\n  title: string;\n  category: string;\n  intervalMiles: number;\n  intervalMonths: number;\n  dueMileage: number;\n  dueDate?: string;\n  lastPerformedDate?: string;\n  lastPerformedMileage?: number;\n  status: 'Overdue' | 'Due Soon' | 'OK' | 'Upcoming';\n  estimatedCost: number;\n  description: string;\n}` },
              { title: '8. Attachment', code: `export interface Attachment {\n  id: string;\n  vehicleId: string;\n  serviceRecordId?: string;\n  title: string;\n  category: 'Invoice' | 'Manual' | 'Insurance' | 'Registration' | 'Inspection' | 'Warranty' | 'Receipt';\n  uploadDate: string;\n  fileSize: string;\n  fileName: string;\n  fileType: string;\n  pageCount?: number;\n  status: 'Verified' | 'Unparsed' | 'Archived';\n}` },
              { title: '9. Provider', code: `export interface Provider {\n  id: string;\n  name: string;\n  type: 'Dealer' | 'Independent Shop' | 'Chain' | 'DIY' | 'Mobile Service' | 'Inspection Station';\n  address?: string;\n  phone?: string;\n  website?: string;\n}` },
              { title: '10. CostBreakdown', code: `export interface CostBreakdown {\n  laborCost: number;\n  partsCost: number;\n  fees: number;\n  tax: number;\n  processingFee: number;\n  discount: number;\n  dealerCredit: number;\n  finalInvoiceTotal: number;\n  actualDocumentedPayment: number;\n}` },
              { title: '11. EvidenceSource', code: `export interface EvidenceSource {\n  id: string;\n  attachmentId?: string;\n  sourceType: 'Invoice' | 'Receipt' | 'Carfax' | 'UserEntry' | 'Inspection' | 'Other';\n  evidenceFilename?: string;\n  evidencePage?: number;\n  confidenceGrade: 'A' | 'B' | 'C' | 'D' | 'E';\n  verificationNeeded: boolean;\n  duplicateGroupId?: string;\n}` },
              { title: '12. ServiceRecord', code: `export interface ServiceRecord {\n  id: string;\n  vehicleId: string;\n  serviceDate?: string;\n  datePrecision: 'Exact' | 'Month' | 'Year' | 'Unknown';\n  mileageIn?: number;\n  mileageOut?: number;\n  mileagePrecision: 'Exact' | 'Estimated' | 'Unknown';\n  provider: Provider | string;\n  location?: string;\n  invoiceNumber?: string;\n  category: string;\n  complaintReason?: string;\n  status: ServiceRecordStatus;\n  workPerformed: string;\n  partsReplaced: Part[];\n  partNumbers?: string[];\n  fluidsAndMaterials: FluidOrMaterial[];\n  laborCost: number;\n  partsCost: number;\n  fees: number;\n  tax: number;\n  processingFee: number;\n  discount: number;\n  dealerCredit: number;\n  finalInvoiceTotal: number;\n  actualDocumentedPayment: number;\n  sourceType: 'Invoice' | 'Receipt' | 'Carfax' | 'UserEntry' | 'Inspection' | 'Other';\n  confidenceGrade: 'A' | 'B' | 'C' | 'D' | 'E';\n  evidenceFilename?: string;\n  evidencePage?: number;\n  duplicateGroupId?: string;\n  verificationNeeded: boolean;\n  notes?: string;\n  nextServiceMileage?: number;\n  nextServiceDate?: string;\n}` },
            ].map((entity, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-950 text-slate-100 border border-slate-800 space-y-2">
                <span className="font-bold text-blue-400 font-sans text-sm block">{entity.title}</span>
                <pre className="text-[11px] text-slate-300 overflow-x-auto leading-relaxed">{entity.code}</pre>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab: Product Scope */}
      {activeTab === 'scope' && (
        <div className="space-y-6">
          <Card className="blueprint-card space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Product Scope & Vision</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
              <Card variant="raised" className="blueprint-info-card space-y-2">
                <h3 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                  Core Purpose & Boundaries
                </h3>
                <p className="text-slate-700 dark:text-slate-300">
                  AutoLog is a local-first personal vehicle maintenance, repair, and issue log. It anchors maintenance history to confidence grades, helping users track cost-per-mile metrics and schedule preventative intervals.
                </p>
                <p className="text-slate-700 dark:text-slate-300 font-semibold">
                  The application starts empty, supports multiple vehicles, and offers an optional fictional demo dataset.
                </p>
              </Card>

              <Card variant="raised" className="blueprint-info-card space-y-2">
                <h3 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                  Target User Persona
                </h3>
                <p className="text-slate-700 dark:text-slate-300">
                  DIY vehicle enthusiasts and personal vehicle owners who want structured, invoice-backed service history rather than messy paper gloves in the glovebox or untracked memory logs.
                </p>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Grades */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          <Card className="blueprint-card space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Confidence-Grade Verification Matrix (A to E)</span>
            </h2>

            <div className="space-y-3 text-xs">
              {[
                { grade: 'Grade A', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', title: 'Original invoice, repair order, official inspection or receipt', desc: 'Record is backed by an attached scanned PDF invoice, dealer work order, or store receipt containing date, mileage, shop name, and line items.' },
                { grade: 'Grade B', badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30', title: 'CARFAX-only record', desc: 'Sourced from third-party CARFAX vehicle report summaries.' },
                { grade: 'Grade C', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', title: 'User-confirmed and partially corroborated', desc: 'DIY service performed by owner with attached parts store receipt (e.g. oil jug invoice, filter receipt) verifying parts installation.' },
                { grade: 'Grade D', badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30', title: 'User-confirmed only', desc: 'Unbacked historical entry added from owner memory without date, exact mileage, or receipts.' },
                { grade: 'Grade E', badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30', title: 'Planned, estimated or unresolved', desc: 'Scheduled future work, estimate, or open diagnostic defect.' },
              ].map((g, idx) => (
                <Card
                  key={idx}
                  variant="raised"
                  className="blueprint-info-card space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${g.badge}`}>{g.grade}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{g.title}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-1">{g.desc}</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab: MVP & Roadmap */}
      {activeTab === 'roadmap' && (
        <Card className="blueprint-card space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>MVP Features vs Later-Phase Roadmap</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Phase 1: Current Application Shell (MVP)</span>
              </h3>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300 list-disc list-inside">
                <li>Complete TypeScript domain definitions and IndexedDB persistence.</li>
                <li>Responsive mobile-first shell with bottom nav & desktop sidebar.</li>
                <li>Empty-first onboarding with optional sanitized demo data.</li>
                <li>Full 10-screen architecture.</li>
                <li>Confidence grade tagging (A/B/C/D/E) & 13 status flags.</li>
                <li>Interactive mileage projection calculator for maintenance rules.</li>
                <li>Active defect reporting & mark-resolved flow.</li>
              </ul>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <h3 className="font-bold text-blue-700 dark:text-blue-400 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Phase 2 & 3: Future Engine Integration</span>
              </h3>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300 list-disc list-inside">
                <li>Firebase Firestore cloud synchronization (when requested).</li>
                <li>Gemini AI Multimodal OCR receipt & invoice auto-parser.</li>
                <li>Google OAuth authentication.</li>
                <li>OBD-II Bluetooth scanner trouble code diagnostic parser.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Risks */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          <Card className="blueprint-card space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Risk Matrix & Operational Mitigations</span>
            </h2>

            <div className="space-y-3 text-xs">
              {[
                { risk: 'Risk: Client LocalStorage Data Loss', impact: 'User clears browser cache before cloud persistence.', mitigation: 'Provide one-click "Export JSON" backup button in Service History and sample reset in Settings.' },
                { risk: 'Risk: Mileage Rollback / Discrepancy', impact: 'A user logs a new service record with lower mileage than previous logs.', mitigation: 'Enforce automatic validation checks when updating odometer readings.' },
                { risk: 'Risk: Recommendations Marked as Complete', impact: 'Inaccurate service history leading to false maintenance claims.', mitigation: 'Explicit separation of 13 statuses. Recommended and Planned entries cannot be saved as Completed without verification.' },
              ].map((r, idx) => (
                <Card
                  key={idx}
                  variant="raised"
                  className="blueprint-info-card space-y-1"
                >
                  <div className="font-bold text-amber-600 dark:text-amber-400">{r.risk}</div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">Impact: {r.impact}</p>
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">Mitigation Strategy: {r.mitigation}</p>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
