import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ServiceRecord,
  ServiceRecordStatus,
  ConfidenceGrade,
  DatePrecision,
  MileagePrecision,
  Part,
  FluidOrMaterial,
  Provider,
} from '../../types';
import {
  PlusCircle,
  FileCheck,
  DollarSign,
  Calendar,
  Gauge,
  Tag,
  Check,
  Wrench,
  AlertTriangle,
  Plus,
  Trash2,
  Package,
  Droplet,
  ShieldAlert,
  ArrowLeft,
  Building2,
  FileText,
} from 'lucide-react';

interface AddRecordScreenProps {
  recordToEdit?: ServiceRecord | null;
  onDoneEditing?: () => void;
}

export function parseOptionalNonNegativeNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function preserveProviderRepresentation(
  original: Provider | string | undefined,
  providerName: string,
  representationChanged: boolean
): Provider | string {
  if (original && typeof original !== 'string' && !representationChanged) {
    return original;
  }
  return providerName;
}

export const AddRecordScreen: React.FC<AddRecordScreenProps> = ({
  recordToEdit,
  onDoneEditing,
}) => {
  const {
    vehicles,
    activeVehicleId,
    activeVehicle,
    addRecord,
    updateRecord,
    setCurrentScreen,
    currencySymbol,
    checkDuplicateInvoiceNumber,
    showToast,
  } = useApp();

  const isEditMode = Boolean(recordToEdit);

  // Form Fields
  const [vehicleId, setVehicleId] = useState(
    recordToEdit?.vehicleId || activeVehicleId || activeVehicle.id
  );
  const [serviceDate, setServiceDate] = useState(
    recordToEdit
      ? recordToEdit.serviceDate ?? recordToEdit.date ?? ''
      : new Date().toISOString().split('T')[0]
  );
  const [datePrecision, setDatePrecision] = useState<DatePrecision>(
    recordToEdit?.datePrecision || 'Exact'
  );

  const [mileageIn, setMileageIn] = useState<string>(
    recordToEdit
      ? recordToEdit.mileageIn?.toString() ?? recordToEdit.mileage?.toString() ?? ''
      : activeVehicle.currentMileage.toString()
  );
  const [mileageOut, setMileageOut] = useState<string>(
    recordToEdit?.mileageOut !== undefined ? recordToEdit.mileageOut.toString() : ''
  );
  const [mileagePrecision, setMileagePrecision] = useState<MileagePrecision>(
    recordToEdit?.mileagePrecision || 'Exact'
  );
  const [overrideLowerMileageOut, setOverrideLowerMileageOut] = useState(false);

  const [providerName, setProviderName] = useState<string>(
    typeof recordToEdit?.provider === 'string'
      ? recordToEdit.provider
      : recordToEdit?.provider?.name || 'Fictional Auto Lab'
  );
  const [providerRepresentationChanged, setProviderRepresentationChanged] =
    useState(false);
  const [location, setLocation] = useState(recordToEdit?.location || '');
  const [invoiceNumber, setInvoiceNumber] = useState(recordToEdit?.invoiceNumber || '');

  const [category, setCategory] = useState<string>(recordToEdit?.category || 'Maintenance');
  const [status, setStatus] = useState<ServiceRecordStatus>(recordToEdit?.status || 'Completed');
  const [confidenceGrade, setConfidenceGrade] = useState<ConfidenceGrade>(
    recordToEdit?.confidenceGrade || 'A'
  );
  const [sourceType, setSourceType] = useState<
    'Invoice' | 'Receipt' | 'Carfax' | 'UserEntry' | 'Inspection' | 'Other'
  >(recordToEdit?.sourceType || 'Invoice');

  const [title, setTitle] = useState(recordToEdit?.title || '');
  const [complaintReason, setComplaintReason] = useState(recordToEdit?.complaintReason || '');
  const [workPerformed, setWorkPerformed] = useState(
    recordToEdit?.workPerformed || recordToEdit?.title || ''
  );

  // Financial Breakdown (numeric >= 0)
  const [laborCost, setLaborCost] = useState<number>(recordToEdit?.laborCost ?? 0);
  const [partsCost, setPartsCost] = useState<number>(recordToEdit?.partsCost ?? 0);
  const [fees, setFees] = useState<number>(recordToEdit?.fees ?? 0.0);
  const [tax, setTax] = useState<number>(recordToEdit?.tax ?? 0.0);
  const [processingFee, setProcessingFee] = useState<number>(recordToEdit?.processingFee ?? 0.0);
  const [discount, setDiscount] = useState<number>(recordToEdit?.discount ?? 0.0);
  const [dealerCredit, setDealerCredit] = useState<number>(recordToEdit?.dealerCredit ?? 0.0);
  const [actualPayment, setActualPayment] = useState<number>(
    recordToEdit?.actualDocumentedPayment ?? recordToEdit?.finalInvoiceTotal ?? 0
  );

  // Dynamic Lists: Parts Replaced & Fluids/Materials
  const [partsReplaced, setPartsReplaced] = useState<Part[]>(recordToEdit?.partsReplaced || []);
  const [fluidsAndMaterials, setFluidsAndMaterials] = useState<FluidOrMaterial[]>(
    recordToEdit?.fluidsAndMaterials || []
  );

  const [verificationNeeded, setVerificationNeeded] = useState<boolean>(
    recordToEdit?.verificationNeeded ?? false
  );
  const [evidenceFilename, setEvidenceFilename] = useState(
    recordToEdit?.evidenceFilename || 'service-document.pdf'
  );
  const [evidencePage, setEvidencePage] = useState<number>(recordToEdit?.evidencePage || 1);
  const [notes, setNotes] = useState(recordToEdit?.notes || '');
  const [tagsInput, setTagsInput] = useState(
    recordToEdit?.tags ? recordToEdit.tags.join(', ') : 'maintenance'
  );

  // Auto calculate total invoice cost
  const calculatedTotal = Math.max(
    0,
    laborCost + partsCost + fees + tax + processingFee - discount - dealerCredit
  );

  useEffect(() => {
    if (!isEditMode) {
      setActualPayment(calculatedTotal);
    }
  }, [calculatedTotal, isEditMode]);

  // Validation Error States
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const validateForm = (): boolean => {
    const errs: { [key: string]: string } = {};

    // Rule 1: Costs cannot be negative
    if (laborCost < 0) errs.laborCost = 'Labor cost cannot be negative.';
    if (partsCost < 0) errs.partsCost = 'Parts cost cannot be negative.';
    if (fees < 0) errs.fees = 'Fees cannot be negative.';
    if (tax < 0) errs.tax = 'Tax cannot be negative.';
    if (processingFee < 0) errs.processingFee = 'Processing fee cannot be negative.';
    if (discount < 0) errs.discount = 'Discount cannot be negative.';
    if (dealerCredit < 0) errs.dealerCredit = 'Dealer credit cannot be negative.';
    if (actualPayment < 0) errs.actualPayment = 'Actual payment cannot be negative.';

    // Rule 2: Mileage out < mileage in unless overridden
    const numericMileageIn = parseOptionalNonNegativeNumber(mileageIn);
    const numericMileageOut = mileageOut.trim() !== '' ? Number(mileageOut) : null;
    if (mileageIn.trim() !== '' && numericMileageIn === undefined) {
      errs.mileageIn = 'Mileage In must be a valid non-negative number.';
    }
    if (
      numericMileageOut !== null &&
      (!Number.isFinite(numericMileageOut) || numericMileageOut < 0)
    ) {
      errs.mileageOut = 'Mileage Out must be a valid non-negative number.';
    } else if (
      numericMileageOut !== null &&
      numericMileageIn !== undefined &&
      numericMileageOut < numericMileageIn &&
      !overrideLowerMileageOut
    ) {
      errs.mileageOut =
        'Mileage Out cannot be lower than Mileage In unless explicitly overridden below.';
    }

    // Rule 3: Completed records require work performed or diagnostic finding
    const isCompletedStatus = status === 'Completed' || status === 'User-Completed';
    if (isCompletedStatus && !workPerformed.trim() && !complaintReason.trim()) {
      errs.workPerformed =
        'Completed records require either work performed details or diagnostic findings.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddPart = () => {
    const newPart: Part = {
      id: `part-${Date.now()}`,
      name: 'New Replacement Part',
      partNumber: '',
      manufacturer: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
    };
    setPartsReplaced([...partsReplaced, newPart]);
  };

  const handleAddFluid = () => {
    const newFluid: FluidOrMaterial = {
      id: `fluid-${Date.now()}`,
      name: 'Engine Oil / Fluid',
      specification: '',
      quantity: 5,
      unitOfMeasure: 'Quarts',
      unitCost: 0,
      totalCost: 0,
    };
    setFluidsAndMaterials([...fluidsAndMaterials, newFluid]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    if (!validateForm()) {
      showToast('Please fix validation errors before saving.', 'error');
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const recordData: Omit<ServiceRecord, 'id'> = {
      vehicleId,
      serviceDate: serviceDate || undefined,
      datePrecision,
      mileageIn: parseOptionalNonNegativeNumber(mileageIn),
      mileageOut: parseOptionalNonNegativeNumber(mileageOut),
      mileagePrecision,
      provider: preserveProviderRepresentation(
        recordToEdit?.provider,
        providerName,
        providerRepresentationChanged
      ),
      location,
      invoiceNumber,
      category,
      complaintReason,
      status,
      workPerformed: workPerformed || title || 'Service record entry',
      title: title || workPerformed || 'Service Record',
      partsReplaced,
      fluidsAndMaterials,
      laborCost: Math.max(0, laborCost),
      partsCost: Math.max(0, partsCost),
      fees: Math.max(0, fees),
      tax: Math.max(0, tax),
      processingFee: Math.max(0, processingFee),
      discount: Math.max(0, discount),
      dealerCredit: Math.max(0, dealerCredit),
      finalInvoiceTotal: calculatedTotal,
      actualDocumentedPayment: Math.max(0, actualPayment),
      totalCost: Math.max(0, actualPayment),
      sourceType,
      confidenceGrade,
      evidenceFilename,
      evidencePage,
      verificationNeeded,
      notes,
      tags: tagsArray,
      receiptAttached: Boolean(evidenceFilename),
      documentNames: evidenceFilename ? [evidenceFilename] : [],
      isSampleData: false,
    };

    try {
      if (isEditMode && recordToEdit) {
        await updateRecord({
          ...recordData,
          id: recordToEdit.id,
        });
        if (onDoneEditing) onDoneEditing();
      } else {
        await addRecord(recordData);
        setCurrentScreen('history');
      }
    } catch {
      // AppContext surfaces the persistence failure and the form stays open.
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen-root max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="token-surface border p-6 rounded-2xl shadow-sm space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {isEditMode && (
              <button
                type="button"
                onClick={onDoneEditing}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">
                {isEditMode ? 'Edit Service Record' : 'Log New Service or Repair Record'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Full 12-interface data model record entry with automated cost breakdown & validation rules.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section 1: Core Identifiers & Vehicle */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-500" />
              <span>1. Vehicle & Service Classification</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Target Vehicle *
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => {
                    setVehicleId(e.target.value);
                    const sel = vehicles.find((v) => v.id === e.target.value);
                    if (sel) setMileageIn(sel.currentMileage.toString());
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} ({v.trim})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="Maintenance">Maintenance</option>
                  <option value="Repair">Repair</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Tires">Tires</option>
                  <option value="Oil Change">Oil Change</option>
                  <option value="Brakes">Brakes</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Detailing">Detailing</option>
                  <option value="Recall">Recall / Warranty</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Record Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ServiceRecordStatus)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="Completed">Completed</option>
                  <option value="User-Completed">User-Completed (DIY)</option>
                  <option value="Diagnostic Only">Diagnostic Only</option>
                  <option value="Inspection Only">Inspection Only</option>
                  <option value="Parts Purchased">Parts Purchased</option>
                  <option value="Recommended">Recommended</option>
                  <option value="Declined">Declined</option>
                  <option value="Deferred">Deferred</option>
                  <option value="Planned">Planned</option>
                  <option value="Monitoring">Monitoring</option>
                  <option value="Completion Unverified">Completion Unverified</option>
                  <option value="Mileage Observation">Mileage Observation</option>
                  <option value="Administrative Only">Administrative Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Service Title / Headline *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Engine Oil & Filter Service, Front Brake Pad Replacement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Section 2: Dates, Mileage, Provider & Invoice */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>2. Dates, Mileage & Repair Order</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Service Date *
                </label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Date Precision
                </label>
                <select
                  value={datePrecision}
                  onChange={(e) => setDatePrecision(e.target.value as DatePrecision)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Exact">Exact Day</option>
                  <option value="Month">Month Only</option>
                  <option value="Year">Year Only</option>
                  <option value="Unknown">Unknown Date</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Provider / Shop Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fictional Auto Lab, Home Workshop"
                  value={providerName}
                  onChange={(e) => {
                    setProviderName(e.target.value);
                    setProviderRepresentationChanged(true);
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Mileage In (mi) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={mileageIn}
                  onChange={(e) => setMileageIn(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Mileage Out (mi)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Optional (if different)"
                  value={mileageOut}
                  onChange={(e) => setMileageOut(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border bg-white dark:bg-slate-800 font-mono ${
                    errors.mileageOut
                      ? 'border-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
                {errors.mileageOut && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1">
                    {errors.mileageOut}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Repair Order / Invoice #
                </label>
                <input
                  type="text"
                  placeholder="e.g. RO-883921"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            {/* Override Mileage Out < Mileage In Checkbox if error */}
            {mileageOut.trim() !== '' &&
              mileageIn.trim() !== '' &&
              Number(mileageOut) < Number(mileageIn) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                <input
                  type="checkbox"
                  id="overrideMileage"
                  checked={overrideLowerMileageOut}
                  onChange={(e) => setOverrideLowerMileageOut(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="overrideMileage" className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Explicitly allow Mileage Out ({mileageOut}) to be lower than Mileage In ({mileageIn}) (e.g. cluster swap or reset)
                </label>
              </div>
            )}
          </div>

          {/* Section 3: Work Details & Diagnostic Findings */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>3. Work Details & Diagnostic Findings</span>
            </h3>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Complaint / Reason for Service
              </label>
              <input
                type="text"
                placeholder="e.g. Scheduled 30,000 mile maintenance, Squealing sound when braking"
                value={complaintReason}
                onChange={(e) => setComplaintReason(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Work Performed Details *
              </label>
              <textarea
                rows={3}
                placeholder="Detailed report of work performed, inspection observations, torque specs..."
                value={workPerformed}
                onChange={(e) => setWorkPerformed(e.target.value)}
                className={`w-full p-2.5 rounded-lg border bg-white dark:bg-slate-800 font-medium ${
                  errors.workPerformed
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.workPerformed && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1">
                  {errors.workPerformed}
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Parts Replaced & Fluids */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" />
                <span>4. Parts & Fluids Itemized</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddPart}
                  className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Part</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddFluid}
                  className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Fluid</span>
                </button>
              </div>
            </div>

            {/* Dynamic Parts List */}
            {partsReplaced.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-[11px] text-slate-500 block">Itemized Replacement Parts</span>
                {partsReplaced.map((part, idx) => (
                  <div key={part.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center">
                    <input
                      type="text"
                      placeholder="Part Name"
                      value={part.name}
                      onChange={(e) => {
                        const next = [...partsReplaced];
                        next[idx].name = e.target.value;
                        setPartsReplaced(next);
                      }}
                      className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Part #"
                      value={part.partNumber || ''}
                      onChange={(e) => {
                        const next = [...partsReplaced];
                        next[idx].partNumber = e.target.value;
                        setPartsReplaced(next);
                      }}
                      className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={part.quantity}
                      onChange={(e) => {
                        const next = [...partsReplaced];
                        const q = Math.max(1, Number(e.target.value));
                        next[idx].quantity = q;
                        next[idx].totalCost = q * next[idx].unitCost;
                        setPartsReplaced(next);
                      }}
                      className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Unit Cost ($)"
                      min="0"
                      step="0.01"
                      value={part.unitCost}
                      onChange={(e) => {
                        const next = [...partsReplaced];
                        const uc = Math.max(0, Number(e.target.value));
                        next[idx].unitCost = uc;
                        next[idx].totalCost = uc * next[idx].quantity;
                        setPartsReplaced(next);
                      }}
                      className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setPartsReplaced(partsReplaced.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded text-center shrink-0 self-center"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Dynamic Fluids List */}
            {fluidsAndMaterials.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-[11px] text-slate-500 block">Itemized Fluids & Materials</span>
                {fluidsAndMaterials.map((fluid, idx) => (
                  <div key={fluid.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center">
                    <input
                      type="text"
                      placeholder="Fluid Name"
                      value={fluid.name}
                      onChange={(e) => {
                        const next = [...fluidsAndMaterials];
                        next[idx].name = e.target.value;
                        setFluidsAndMaterials(next);
                      }}
                      className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="Spec (e.g. 0W-20)"
                      value={fluid.specification || ''}
                      onChange={(e) => {
                        const next = [...fluidsAndMaterials];
                        next[idx].specification = e.target.value;
                        setFluidsAndMaterials(next);
                      }}
                      className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={fluid.quantity}
                      onChange={(e) => {
                        const next = [...fluidsAndMaterials];
                        const q = Math.max(1, Number(e.target.value));
                        next[idx].quantity = q;
                        next[idx].totalCost = q * next[idx].unitCost;
                        setFluidsAndMaterials(next);
                      }}
                      className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                    <input
                      type="number"
                      placeholder="Total Cost ($)"
                      min="0"
                      step="0.01"
                      value={fluid.totalCost}
                      onChange={(e) => {
                        const next = [...fluidsAndMaterials];
                        next[idx].totalCost = Math.max(0, Number(e.target.value));
                        setFluidsAndMaterials(next);
                      }}
                      className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setFluidsAndMaterials(fluidsAndMaterials.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded text-center shrink-0 self-center"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Financial Cost Breakdown */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>5. Financial Cost Breakdown (Numeric &ge; 0)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Labor Cost ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Parts Cost ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={partsCost}
                  onChange={(e) => setPartsCost(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Fees & Environmental ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fees}
                  onChange={(e) => setFees(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Sales Tax ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Discount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Dealer Credit ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dealerCredit}
                  onChange={(e) => setDealerCredit(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Calculated Invoice Total
                </label>
                <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100">
                  {currencySymbol}{calculatedTotal.toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Actual Payment Made ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={actualPayment}
                  onChange={(e) => setActualPayment(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Source & Confidence Grade */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-500" />
              <span>6. Source Type & Verification Grade</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Source Type
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Invoice">Invoice / Repair Order</option>
                  <option value="Receipt">Store Receipt</option>
                  <option value="Carfax">Carfax Report</option>
                  <option value="UserEntry">User Entry (Manual)</option>
                  <option value="Inspection">Inspection Sheet</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Confidence Grade *
                </label>
                <select
                  value={confidenceGrade}
                  onChange={(e) => setConfidenceGrade(e.target.value as ConfidenceGrade)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="A">Grade A - Original Receipt / Scanned PDF Invoice</option>
                  <option value="B">Grade B - CARFAX / Third-party Record</option>
                  <option value="C">Grade C - DIY with Parts Receipt</option>
                  <option value="D">Grade D - User Memory Entry</option>
                  <option value="E">Grade E - Estimated / Recommendation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Evidence File Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Invoice_Scan_2026.pdf"
                  value={evidenceFilename}
                  onChange={(e) => setEvidenceFilename(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="verificationNeededCheck"
                checked={verificationNeeded}
                onChange={(e) => setVerificationNeeded(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="verificationNeededCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Flag record as "Verification Needed" (unverified completion or missing documentation)
              </label>
            </div>
          </div>

          {/* Section 7: Notes & Tags */}
          <div>
            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
              Additional Notes & Tags
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes, technician comments, special torque specs..."
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 mb-2"
            />
            <input
              type="text"
              placeholder="Tags (comma-separated, e.g. oil, maintenance, dealer)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (isEditMode && onDoneEditing) {
                  onDoneEditing();
                } else {
                  setCurrentScreen('history');
                }
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg transition-colors flex items-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isSubmitting
                  ? 'Saving…'
                  : isEditMode
                    ? 'Update Service Record'
                    : 'Save Service Record'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
