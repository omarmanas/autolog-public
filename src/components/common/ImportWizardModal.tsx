import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  parseImportFile,
  findDuplicates,
  classifySheet,
  evaluateReconciliationGate,
  ParsedWorkbookData,
  DuplicateMatch,
} from '../../utils/importParser';
import { ServiceRecord, ImportBatchRecord } from '../../types';
import { formatMileage } from '../../utils/formatters';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  FileText,
  ShieldCheck,
  ListFilter,
  AlertCircle,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function checkCanContinueStep2(
  parsedData: ParsedWorkbookData | null,
  selectedSheets: Record<string, boolean>,
  isProcessing: boolean = false
): boolean {
  if (!parsedData || isProcessing) return false;
  if (parsedData.errors && parsedData.errors.length > 0) return false;
  if (parsedData.rejectedRows && parsedData.rejectedRows.length > 0) return false;
  if (parsedData.warnings && parsedData.warnings.length > 0) return false;

  if (parsedData.records.length === 0) return false;

  if (!parsedData.records.every((r) => classifySheet(r.sourceSheet || '') === 'master')) return false;

  const selectedSheetNames = Object.keys(selectedSheets).filter((s) => selectedSheets[s]);
  const hasMaster = selectedSheetNames.some((s) => classifySheet(s) === 'master');
  const hasIssues = selectedSheetNames.some((s) => classifySheet(s) === 'issues');
  const hasPlanner = selectedSheetNames.some((s) => classifySheet(s) === 'planner');
  const hasReference = selectedSheetNames.some((s) => classifySheet(s) === 'reference');

  if (!hasMaster || !hasIssues || !hasPlanner || hasReference) return false;

  return true;
}

export function ImportWizardModal({ isOpen, onClose }: Props) {
  const { activeVehicle, records, addImportBatch, rollbackImportBatch, currencySymbol } = useApp();

  const [step, setStep] = useState<number>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedWorkbookData | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Record<string, boolean>>({});
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastBatch, setLastBatch] = useState<ImportBatchRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'rejected' | 'warnings'>('records');

  const canContinueStep2 = checkCanContinueStep2(parsedData, selectedSheets, isProcessing);


  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const data = parseImportFile(buffer, file.name, activeVehicle.id);
      setParsedData(data);

      const sheetsObj: Record<string, boolean> = {};
      data.sheetsFound.forEach((sheet) => {
        const type = classifySheet(sheet);
        // Only canonical sheets are selected by default
        sheetsObj[sheet] = type !== 'reference';
      });
      setSelectedSheets(sheetsObj);

      const dupMatches = findDuplicates(data.records, records);
      setDuplicates(dupMatches);

      setStep(2);
    } catch (err: any) {
      alert(`Error reading file: ${err.message || String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSheet = (sheet: string) => {
    setSelectedSheets((prev) => ({ ...prev, [sheet]: !prev[sheet] }));
  };

  const handleDuplicateChoice = (idx: number, choice: 'skip' | 'merge' | 'import_separately') => {
    setDuplicates((prev) => {
      const updated = [...prev];
      updated[idx].choice = choice;
      return updated;
    });
  };

  // Cost rules calculation from parsed transaction records
  const calculateImportedTotals = () => {
    if (!parsedData) return { repairTotal: 0, diagTotal: 0, docTotal: 0, diyTotal: 0, feesTotal: 0, openGapsCount: 0 };

    let repairTotal = 0;
    let diagTotal = 0;
    let docTotal = 0;
    let diyTotal = 0;
    let feesTotal = 0;

    const skippedRecordIds = new Set(
      duplicates.filter((d) => d.choice === 'skip').map((d) => d.record.id)
    );

    parsedData.records.forEach((rec) => {
      if (skippedRecordIds.has(rec.id)) return;

      // Recommended, declined, and unverified estimates do not count toward actual spending totals
      if (rec.status === 'Recommended' || rec.status === 'Declined' || rec.status === 'Planned' || rec.status === 'Completion Unverified') {
        return;
      }

      const cost = Number(rec.actualDocumentedPayment ?? rec.finalInvoiceTotal ?? rec.totalCost) || 0;

      if (rec.status === 'Diagnostic Only') {
        diagTotal += cost;
      } else {
        repairTotal += cost;
      }

      docTotal += cost;

      if (rec.status === 'User-Completed' || rec.category?.toLowerCase().includes('diy')) {
        diyTotal += rec.partsCost || cost;
      }

      feesTotal += rec.processingFee || 0;
    });

    const openGapsCount = parsedData.issues.filter((i) => i.tags?.includes('data-gap')).length;

    return { repairTotal, diagTotal, docTotal, diyTotal, feesTotal, openGapsCount };
  };

  const gateEvaluation = evaluateReconciliationGate(parsedData, duplicates);

  const formatDelta = (deltaCents: number) => {
    if (deltaCents === 0) return <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">($0.00)</span>;
    const sign = deltaCents > 0 ? '+' : '-';
    const val = (Math.abs(deltaCents) / 100).toFixed(2);
    return <span className="text-rose-600 dark:text-rose-400 font-bold ml-1">({sign}${val})</span>;
  };

  const formatCountDelta = (delta: number) => {
    if (delta === 0) return <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">(0)</span>;
    const sign = delta > 0 ? '+' : '-';
    return <span className="text-rose-600 dark:text-rose-400 font-bold ml-1">({sign}{Math.abs(delta)})</span>;
  };

  const handleExecuteImport = () => {
    if (!parsedData || !activeVehicle) return;

    if (!gateEvaluation.canCommit) {
      alert(`Import blocked by safety gate:\n${gateEvaluation.blockingReasons.join('\n')}`);
      return;
    }

    const batchId = `import-${Date.now()}`;
    const skippedRecordIds = new Set(
      duplicates.filter((d) => d.choice === 'skip').map((d) => d.record.id)
    );

    const recordsToImport = parsedData.records.filter((r) => !skippedRecordIds.has(r.id));

    const batchRecord = addImportBatch({
      batchId,
      filename: fileName || 'Import_File',
      records: recordsToImport,
      issues: parsedData.issues,
      maintenanceTasks: parsedData.maintenanceTasks,
      documents: parsedData.documents,
    });

    setLastBatch(batchRecord);
    setStep(5);
  };

  const handleRollback = () => {
    if (lastBatch) {
      rollbackImportBatch(lastBatch.id);
      alert(`Import batch "${lastBatch.id}" has been rolled back successfully.`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Excel / CSV / JSON Import Wizard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target Vehicle: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</span> (VIN: {activeVehicle.vin || 'N/A'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Indicator */}
        <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs overflow-x-auto">
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">1</span>
            <span>Select File</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">2</span>
            <span>Sheets & Preview</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">3</span>
            <span>Duplicates & Validation</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 4 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center">4</span>
            <span>Reconciliation</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <div className={`flex items-center gap-1.5 font-semibold ${step >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center">5</span>
            <span>Summary</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* STEP 1: Select File */}
          {step === 1 && (
            <div className="space-y-6 text-center py-6 max-w-lg mx-auto">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-slate-50/50 dark:bg-slate-950/50">
                <UploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Upload Maintenance History Workbook
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Supports <span className="font-semibold text-slate-700 dark:text-slate-300">.xlsx, .csv, .json</span> (e.g. Vehicle_Maintenance_History.xlsx)
                </p>

                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors cursor-pointer shadow-md">
                  <span>Browse File</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, .json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {isProcessing && (
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold animate-pulse flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Parsing canonical workbook sheets and validating header structures...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Sheets & Preview */}
          {step === 2 && parsedData && (
            <div className="space-y-6">
              {/* Sheet Selection Section */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    1. Sheet Selection & Scope ({parsedData.sheetsFound.length} Total Sheets Found)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Only canonical sheets create domain entities
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {parsedData.sheetsFound.map((sheet) => {
                    const sheetType = classifySheet(sheet);
                    const isCanonical = sheetType !== 'reference';
                    const isSelected = Boolean(selectedSheets[sheet]);

                    return (
                      <label
                        key={sheet}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSheet(sheet)}
                            className="rounded text-blue-600"
                          />
                          <span className="truncate">{sheet}</span>
                        </div>
                        {!isCanonical && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 ml-1">
                            Reference only — not imported
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 9 Metrics Dashboard Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  2. Parsed Data Audit Summary
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 text-center">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400">{parsedData.records.length}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Service Records</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-amber-600 dark:text-amber-400">{parsedData.issues.length}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Active Issues</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-purple-600 dark:text-purple-400">{parsedData.maintenanceTasks.length}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Planner Tasks</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{parsedData.documents.length}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Documents</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-rose-600 dark:text-rose-400">{parsedData.dataGapsCount}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Data Gaps</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">{parsedData.partsCount}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Parts Tracked</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-cyan-600 dark:text-cyan-400">{parsedData.fluidsCount}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Fluids/Filters</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-slate-600 dark:text-slate-400">{parsedData.rejectedRows.length}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Rejected Rows</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-base font-bold text-orange-600 dark:text-orange-400">{parsedData.warnings.length}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Warnings</div>
                  </div>
                </div>
              </div>

              {/* Tabbed Inspection View */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setActiveTab('records')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'records'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span>Canonical Records ({parsedData.records.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('rejected')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'rejected'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span>Rejected Rows ({parsedData.rejectedRows.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('warnings')}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'warnings'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span>Warnings ({parsedData.warnings.length})</span>
                  </button>
                </div>

                {/* Tab Content 1: Service Records Table */}
                {activeTab === 'records' && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2.5">Record ID</th>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Odometer</th>
                          <th className="p-2.5">Provider</th>
                          <th className="p-2.5">Work Description</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {parsedData.records.map((r, i) => (
                          <tr key={r.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="p-2.5 font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">{r.id}</td>
                            <td className="p-2.5 whitespace-nowrap">{r.serviceDate || '—'}</td>
                            <td className="p-2.5 whitespace-nowrap">{formatMileage(r.mileageIn ?? r.mileage, '—')}</td>
                            <td className="p-2.5 truncate max-w-[130px] font-medium">
                              {r.provider ? (typeof r.provider === 'string' ? r.provider : r.provider.name) : '—'}
                            </td>
                            <td className="p-2.5 max-w-xs truncate">{r.workPerformed || '—'}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'Completed'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : r.status === 'Diagnostic Only' || r.status === 'Inspection Only'
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                  : r.status === 'Completion Unverified'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-semibold font-mono">
                              {currencySymbol}{(r.actualDocumentedPayment ?? r.finalInvoiceTotal ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab Content 2: Rejected Rows */}
                {activeTab === 'rejected' && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {parsedData.rejectedRows.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">No rows were rejected.</div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-bold">
                          <tr>
                            <th className="p-2.5">Sheet Name</th>
                            <th className="p-2.5">Row #</th>
                            <th className="p-2.5">Reason</th>
                            <th className="p-2.5">Content Preview</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {parsedData.rejectedRows.map((rej, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                              <td className="p-2.5 font-medium text-slate-700 dark:text-slate-300">{rej.sheetName}</td>
                              <td className="p-2.5 font-mono text-[11px] font-bold text-slate-500">Row {rej.rowNumber}</td>
                              <td className="p-2.5 text-rose-600 dark:text-rose-400 font-semibold">{rej.reason}</td>
                              <td className="p-2.5 font-mono text-[10px] text-slate-400 truncate max-w-xs">{rej.rawContent || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab Content 3: Warnings */}
                {activeTab === 'warnings' && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 max-h-64 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 space-y-1.5 text-xs">
                    {parsedData.warnings.length === 0 ? (
                      <div className="text-slate-500 text-center py-2">No warnings recorded.</div>
                    ) : (
                      parsedData.warnings.map((warn, i) => (
                        <div key={i} className="flex items-start gap-2 text-amber-700 dark:text-amber-400 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                          <span>{warn}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Duplicates & Validation */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-bold">Duplicate Detection Analysis</h4>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    Checked Record ID, Repair Order / Invoice number, Provider, Service Date, and Mileage.
                    Select how each duplicate should be handled.
                  </p>
                </div>
              </div>

              {duplicates.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Duplicate Records Found</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All {parsedData?.records.length || 0} parsed canonical records appear unique and ready for import.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {duplicates.map((dup, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-rose-600 dark:text-rose-400">{dup.reason}</span>
                        <span className="font-mono text-[11px] text-slate-500">ID: {dup.record.id}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Import Row:</span> {dup.record.workPerformed || '—'} ({dup.record.serviceDate || 'no date'}, {currencySymbol}{(dup.record.actualDocumentedPayment || 0).toFixed(2)})
                      </p>
                      <div className="flex items-center gap-4 pt-1 border-t border-slate-200 dark:border-slate-800">
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input
                            type="radio"
                            name={`dup-${idx}`}
                            checked={dup.choice === 'skip'}
                            onChange={() => handleDuplicateChoice(idx, 'skip')}
                          />
                          <span>Skip Import (Recommended)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input
                            type="radio"
                            name={`dup-${idx}`}
                            checked={dup.choice === 'merge'}
                            onChange={() => handleDuplicateChoice(idx, 'merge')}
                          />
                          <span>Merge with Existing</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input
                            type="radio"
                            name={`dup-${idx}`}
                            checked={dup.choice === 'import_separately'}
                            onChange={() => handleDuplicateChoice(idx, 'import_separately')}
                          />
                          <span>Import Separately</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Reconciliation Check */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl text-blue-800 dark:text-blue-300 text-xs space-y-1">
                <h4 className="font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  Cost Reconciliation & Safety Gate Validation
                </h4>
                <p className="opacity-90">
                  Transaction cost buckets are calculated in integer cents and compared against approved workbook benchmarks from the Cost Summary sheet.
                </p>
              </div>

              {!gateEvaluation.canCommit && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-xl text-xs space-y-2">
                  <h5 className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Confirm & Commit Blocked ({gateEvaluation.blockingReasons.length} Unresolved Condition{gateEvaluation.blockingReasons.length > 1 ? 's' : ''})</span>
                  </h5>
                  <ul className="list-disc pl-5 space-y-1 text-rose-700 dark:text-rose-400 font-mono text-[11px]">
                    {gateEvaluation.blockingReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {gateEvaluation.canCommit && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl text-xs space-y-1 text-emerald-800 dark:text-emerald-300 font-medium">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Safety Gate Clear — All Cost Buckets & Provenance Checks Match Authoritative Benchmarks</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Calculated From Import Transactions
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Repair / Service Spending:</span>
                      <span className="font-bold font-mono">{currencySymbol}{(gateEvaluation.calculatedCents.repairServiceCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Diagnostic Spending:</span>
                      <span className="font-bold font-mono">{currencySymbol}{(gateEvaluation.calculatedCents.diagnosticCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 text-slate-900 dark:text-slate-100 font-bold">
                      <span>Invoice-Backed Total:</span>
                      <span className="font-mono">{currencySymbol}{(gateEvaluation.calculatedCents.invoiceBackedCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 pt-1">
                      <span>DIY Parts Cost:</span>
                      <span className="font-mono">{currencySymbol}{(gateEvaluation.calculatedCents.diyPartsCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Processing Fees:</span>
                      <span className="font-mono">{currencySymbol}{(gateEvaluation.calculatedCents.processingFeesCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>Open Data Gaps:</span>
                      <span className="font-mono">{parsedData?.dataGapsCount || gateEvaluation.calculatedCents.openDataGapsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Approved Benchmark & Difference
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Benchmark Repair Cost:</span>
                      <span className="font-bold font-mono">{currencySymbol}{(gateEvaluation.benchmarkCents.repairServiceCents / 100).toFixed(2)} {formatDelta(gateEvaluation.deltasCents.repair)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Benchmark Diagnostic:</span>
                      <span className="font-bold font-mono">{currencySymbol}{(gateEvaluation.benchmarkCents.diagnosticCents / 100).toFixed(2)} {formatDelta(gateEvaluation.deltasCents.diag)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 text-slate-900 dark:text-slate-100 font-bold">
                      <span>Benchmark Invoice Total:</span>
                      <span className="font-mono">{currencySymbol}{(gateEvaluation.benchmarkCents.invoiceBackedCents / 100).toFixed(2)} {formatDelta(gateEvaluation.deltasCents.invoiceBacked)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 pt-1">
                      <span>Benchmark DIY Parts:</span>
                      <span className="font-mono">{currencySymbol}{(gateEvaluation.benchmarkCents.diyPartsCents / 100).toFixed(2)} {formatDelta(gateEvaluation.deltasCents.diy)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Benchmark Processing Fees:</span>
                      <span className="font-mono">{currencySymbol}{(gateEvaluation.benchmarkCents.processingFeesCents / 100).toFixed(2)} {formatDelta(gateEvaluation.deltasCents.fees)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>Benchmark Open Data Gaps:</span>
                      <span className="font-mono">{gateEvaluation.benchmarkCents.openDataGapsCount} {formatCountDelta(gateEvaluation.deltasCents.gaps)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs">
                <span className="font-bold">Automatic Backup Guarantee:</span> Before committing, an automatic JSON state snapshot will be generated. You can use "Undo Last Import" at any time.
              </div>
            </div>
          )}

          {/* STEP 5: Summary */}
          {step === 5 && lastBatch && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Import Completed Successfully
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Batch ID: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{lastBatch.id}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{lastBatch.recordsAdded}</div>
                  <div className="text-[11px] text-slate-500">Service Records</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{lastBatch.issuesAdded}</div>
                  <div className="text-[11px] text-slate-500">Active Issues / Gaps</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{lastBatch.plansAdded}</div>
                  <div className="text-[11px] text-slate-500">Maintenance Plans</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xl font-bold text-slate-600 dark:text-slate-400">{lastBatch.recordsSkipped}</div>
                  <div className="text-[11px] text-slate-500">Skipped Duplicates</div>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={handleRollback}
                  className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Undo Last Import (Rollback)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          {step > 1 && step < 5 ? (
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-3">
            {step < 4 && parsedData && (
              <button
                disabled={
                  step === 2
                    ? !canContinueStep2
                    : !parsedData.reconciliation?.isValid || (parsedData.errors && parsedData.errors.length > 0)
                }
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-md"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 4 && (
              <div className="flex flex-col items-end gap-1">
                <button
                  disabled={!gateEvaluation.canCommit}
                  onClick={handleExecuteImport}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm & Commit Import</span>
                </button>
                {!gateEvaluation.canCommit && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    Commit disabled: {gateEvaluation.blockingReasons[0]}
                  </p>
                )}
              </div>
            )}

            {step === 5 && (
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
