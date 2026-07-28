import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ServiceRecord } from '../../types';
import { ConfidenceBadge, StatusBadge } from '../common/Badges';
import { RecordDetailModal } from '../common/RecordDetailModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AddRecordScreen } from './AddRecordScreen';
import { getProviderDisplayName, getVehicleDisplayName, formatMileage } from '../../utils/formatters';
import {
  History,
  Search,
  Filter,
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Tag,
  Wrench,
  Eye,
  Edit,
  ArrowUpDown,
  Car,
  AlertCircle,
  Building2,
  Calendar,
  Gauge,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

export const ServiceHistoryScreen: React.FC = () => {
  const {
    records,
    vehicles,
    activeVehicleId,
    setActiveVehicleId,
    setCurrentScreen,
    deleteRecord,
    currencySymbol,
    isLoading,
  } = useApp();

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(activeVehicleId || 'ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');

  React.useEffect(() => {
    if (activeVehicleId) {
      setSelectedVehicleId(activeVehicleId);
    }
  }, [activeVehicleId]);

  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_mileage' | 'highest_cost'>('newest');

  // Modals / Editing state
  const [viewingRecord, setViewingRecord] = useState<ServiceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // Extract unique years & providers across records for filter dropdowns
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    records.forEach((r) => {
      const dateStr = r.serviceDate || r.date;
      if (dateStr) {
        const y = dateStr.split('-')[0];
        if (y && y.length === 4) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [records]);

  const availableProviders = useMemo(() => {
    const providersSet = new Set<string>();
    records.forEach((r) => {
      const pName = typeof r.provider === 'string' ? r.provider : r.provider?.name;
      if (pName && pName.trim()) providersSet.add(pName.trim());
    });
    return Array.from(providersSet).sort();
  }, [records]);

  // Filtered & Sorted list calculation
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const pName = typeof rec.provider === 'string' ? rec.provider : rec.provider?.name || '';
      const matchesSearch =
        !q ||
        (rec.title || '').toLowerCase().includes(q) ||
        (rec.workPerformed || '').toLowerCase().includes(q) ||
        (rec.complaintReason || '').toLowerCase().includes(q) ||
        pName.toLowerCase().includes(q) ||
        (rec.invoiceNumber || '').toLowerCase().includes(q) ||
        (rec.notes || '').toLowerCase().includes(q) ||
        (rec.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (rec.partsReplaced || []).some(
          (p) => p.name.toLowerCase().includes(q) || (p.partNumber || '').toLowerCase().includes(q)
        );

      // Vehicle Filter
      const matchesVehicle = selectedVehicleId === 'ALL' || rec.vehicleId === selectedVehicleId;

      // Year Filter
      const recYear = (rec.serviceDate || rec.date || '').split('-')[0];
      const matchesYear = selectedYear === 'ALL' || recYear === selectedYear;

      // Category Filter
      const matchesCategory = selectedCategory === 'ALL' || rec.category === selectedCategory;

      // Provider Filter
      const matchesProvider = selectedProvider === 'ALL' || pName === selectedProvider;

      // Status Filter
      const matchesStatus = selectedStatus === 'ALL' || rec.status === selectedStatus;

      // Grade Filter
      const matchesGrade = selectedGrade === 'ALL' || rec.confidenceGrade === selectedGrade;

      return (
        matchesSearch &&
        matchesVehicle &&
        matchesYear &&
        matchesCategory &&
        matchesProvider &&
        matchesStatus &&
        matchesGrade
      );
    });
  }, [
    records,
    searchQuery,
    selectedVehicleId,
    selectedYear,
    selectedCategory,
    selectedProvider,
    selectedStatus,
    selectedGrade,
  ]);

  const sortedRecords = useMemo(() => {
    const copy = [...filteredRecords];
    copy.sort((a, b) => {
      const dateA = new Date(a.serviceDate || a.date || '1970-01-01').getTime();
      const dateB = new Date(b.serviceDate || b.date || '1970-01-01').getTime();

      const mileageA = a.mileageIn ?? a.mileage ?? 0;
      const mileageB = b.mileageIn ?? b.mileage ?? 0;

      const costA = a.actualDocumentedPayment ?? a.finalInvoiceTotal ?? a.totalCost ?? 0;
      const costB = b.actualDocumentedPayment ?? b.finalInvoiceTotal ?? b.totalCost ?? 0;

      if (sortBy === 'newest') return dateB - dateA;
      if (sortBy === 'oldest') return dateA - dateB;
      if (sortBy === 'highest_mileage') return mileageB - mileageA;
      if (sortBy === 'highest_cost') return costB - costA;
      return 0;
    });
    return copy;
  }, [filteredRecords, sortBy]);

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sortedRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AutoLog_ServiceHistory_Export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (editingRecord) {
    return (
      <AddRecordScreen
        recordToEdit={editingRecord}
        onDoneEditing={() => setEditingRecord(null)}
      />
    );
  }

  const scopeTotal = selectedVehicleId === 'ALL' ? records.length : records.filter((r) => r.vehicleId === selectedVehicleId).length;

  return (
    <div className="space-y-6 pb-20 md:pb-6 text-slate-900 dark:text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Service & Repair History</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Showing {sortedRecords.length} of {scopeTotal} total logged maintenance records.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setCurrentScreen('add-record')}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Multi-Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
        {/* Row 1: Search & Sort */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, work performed, shop, RO #, part numbers, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 font-medium border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
              <ArrowUpDown className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-bold text-[11px] text-slate-500 shrink-0">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-transparent font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="newest">Newest Date</option>
                <option value="oldest">Oldest Date</option>
                <option value="highest_mileage">Highest Mileage</option>
                <option value="highest_cost">Highest Cost</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Specific Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {/* Vehicle */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vehicle</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 font-semibold border border-slate-200 dark:border-slate-700 rounded-lg p-1.5"
            >
              <option value="ALL">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 font-semibold border border-slate-200 dark:border-slate-700 rounded-lg p-1.5"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 font-semibold border border-slate-200 dark:border-slate-700 rounded-lg p-1.5"
            >
              <option value="ALL">All Categories</option>
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

          {/* Provider */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 font-semibold border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 truncate"
            >
              <option value="ALL">All Providers</option>
              {availableProviders.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 font-semibold border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 truncate"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="User-Completed">User-Completed</option>
              <option value="Diagnostic Only">Diagnostic Only</option>
              <option value="Inspection Only">Inspection Only</option>
              <option value="Parts Purchased">Parts Purchased</option>
              <option value="Recommended">Recommended</option>
              <option value="Declined">Declined</option>
              <option value="Deferred">Deferred</option>
              <option value="Completion Unverified">Completion Unverified</option>
            </select>
          </div>

          {/* Confidence Grade */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Grade</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 font-semibold border border-slate-200 dark:border-slate-700 rounded-lg p-1.5"
            >
              <option value="ALL">All Grades</option>
              <option value="A">Grade A (Verified Invoice)</option>
              <option value="B">Grade B (CARFAX / Third-party)</option>
              <option value="C">Grade C (DIY with Parts Receipt)</option>
              <option value="D">Grade D (Manual Memory)</option>
              <option value="E">Grade E (Estimated)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-500">Loading IndexedDB records...</p>
        </div>
      ) : sortedRecords.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-extrabold">No Service Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No service entries matched your active search query and filter criteria. Try resetting filters or log a new record.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedVehicleId('ALL');
              setSelectedYear('ALL');
              setSelectedCategory('ALL');
              setSelectedProvider('ALL');
              setSelectedStatus('ALL');
              setSelectedGrade('ALL');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Records Table / Cards List */
        <div className="space-y-3">
          {sortedRecords.map((rec) => {
            const vehicle = vehicles.find((v) => v.id === rec.vehicleId);
            const providerName = getProviderDisplayName(rec.provider);
            const costVal = rec.actualDocumentedPayment ?? rec.finalInvoiceTotal ?? rec.totalCost ?? 0;

            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      {rec.category}
                    </span>
                    <ConfidenceBadge grade={rec.confidenceGrade} />
                    <StatusBadge status={rec.status} />
                    {rec.verificationNeeded && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Unverified</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 truncate">
                    {rec.title || rec.workPerformed}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                      <Car className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle'}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-mono">{rec.serviceDate || rec.date}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-mono">{formatMileage(rec.mileageIn ?? rec.mileage, 'Not documented')}</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{providerName}</span>
                    </span>

                    {rec.invoiceNumber && (
                      <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        RO #{rec.invoiceNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Cost & Quick Actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 self-stretch md:self-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Documented Paid</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg">
                      {currencySymbol}{costVal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingRecord(rec)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 font-bold transition-colors flex items-center gap-1 text-xs"
                      title="View Full Record Details"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Details</span>
                    </button>

                    <button
                      onClick={() => setEditingRecord(rec)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition-colors"
                      title="Edit Record"
                    >
                      <Edit className="w-4 h-4 text-indigo-500" />
                    </button>

                    <button
                      onClick={() => setDeletingRecordId(rec.id)}
                      className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Detail Modal */}
      {viewingRecord && (
        <RecordDetailModal
          record={viewingRecord}
          vehicle={vehicles.find((v) => v.id === viewingRecord.vehicleId)}
          currencySymbol={currencySymbol}
          onClose={() => setViewingRecord(null)}
          onEdit={(rec) => setEditingRecord(rec)}
          onDelete={(id) => deleteRecord(id)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingRecordId)}
        title="Delete Service Record"
        message="Are you sure you want to delete this service record permanently from IndexedDB?"
        confirmText="Yes, Delete Record"
        isConfirming={isDeletingRecord}
        onConfirm={async () => {
          if (!deletingRecordId || isDeletingRecord) return;
          setIsDeletingRecord(true);
          try {
            await deleteRecord(deletingRecordId);
            setDeletingRecordId(null);
          } catch {
            // AppContext surfaces the persistence failure.
          } finally {
            setIsDeletingRecord(false);
          }
        }}
        onCancel={() => setDeletingRecordId(null)}
      />
    </div>
  );
};
