import React from 'react';
import { useApp } from '../../context/AppContext';
import { ConfidenceBadge, StatusBadge, SeverityBadge, MaintenanceStatusBadge } from '../common/Badges';
import { getProviderDisplayName, formatMileage } from '../../utils/formatters';
import {
  Car,
  DollarSign,
  Gauge,
  AlertTriangle,
  CalendarCheck,
  Plus,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Wrench,
  Sparkles,
  BookOpenCheck,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const {
    activeVehicle,
    records,
    issues,
    maintenanceTasks,
    setCurrentScreen,
    currencySymbol,
  } = useApp();

  const vehicleRecords = activeVehicle ? records.filter((r) => r.vehicleId === activeVehicle.id) : [];
  const vehicleIssues = activeVehicle ? issues.filter((i) => i.vehicleId === activeVehicle.id && i.status !== 'Resolved') : [];
  const vehicleTasks = activeVehicle ? maintenanceTasks.filter((t) => t.vehicleId === activeVehicle.id) : [];

  const totalSpent = vehicleRecords.reduce((acc, curr) => acc + (curr.totalCost ?? curr.actualDocumentedPayment ?? curr.finalInvoiceTotal ?? 0), 0);
  const costPerMile = activeVehicle && activeVehicle.currentMileage > 0 ? (totalSpent / activeVehicle.currentMileage).toFixed(3) : '0.00';

  const gradeACount = vehicleRecords.filter((r) => r.confidenceGrade === 'A').length;

  return (
    <div className="space-[#15] space-y-6 pb-20 md:pb-6">
      {/* Vehicle context banner */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              Vehicle Dashboard
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 font-mono text-blue-700 dark:text-blue-300 font-bold">
                {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Local maintenance history, issues, plans, and documents for the active vehicle.
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentScreen('blueprint')}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors text-xs whitespace-nowrap self-stretch sm:self-auto justify-center"
        >
          <BookOpenCheck className="w-4 h-4" />
          <span>View Blueprint</span>
        </button>
      </div>

      {/* Main Vehicle Hero Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800 text-xs font-mono font-medium border border-slate-700">
              <Car className="w-3.5 h-3.5 text-blue-400" />
              <span>VIN: {activeVehicle.vin}</span>
              <span className="text-slate-500">•</span>
              <span>Plate: {activeVehicle.licensePlate}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
              {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {activeVehicle.trim} • {activeVehicle.engine} • {activeVehicle.transmission}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center sm:text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Mileage</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
                {formatMileage(activeVehicle?.currentMileage, 'Not documented', false)} <span className="text-xs text-slate-400 font-normal">mi</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentScreen('add-record')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Log Maintenance</span>
            </button>
          </div>
        </div>

        {/* Specs quick bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Oil Spec</span>
            <span className="font-medium text-slate-200">{activeVehicle.oilSpecification}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Tire Fitment</span>
            <span className="font-medium text-slate-200">{activeVehicle.tireSize}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Fuel Spec</span>
            <span className="font-medium text-slate-200">{activeVehicle.fuelType}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Color Code</span>
            <span className="font-medium text-slate-200">{activeVehicle.color}</span>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Actual Documented Payments</span>
            <div className="p-2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {currencySymbol}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{vehicleRecords.length} service entries logged</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cost / Mile</span>
            <div className="p-2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {currencySymbol}{costPerMile} <span className="text-xs text-slate-500 font-normal">/mi</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Based on full ownership record</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          onClick={() => setCurrentScreen('issues')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Issues</span>
            <div className="p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono flex items-center gap-2">
              <span>{vehicleIssues.length}</span>
              {vehicleIssues.length > 0 && (
                <span className="text-xs font-sans font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded">
                  Attention Needed
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Open defect & monitoring alerts</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          onClick={() => setCurrentScreen('history')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Confidence Rating</span>
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {gradeACount} / {vehicleRecords.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Grade A verified receipt records</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Issues & Maintenance Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Issues Watchlist */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Active Issues ({vehicleIssues.length})
            </h3>

            <button
              onClick={() => setCurrentScreen('issues')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {vehicleIssues.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">No active issues recorded for this vehicle.</div>
          ) : (
            <div className="space-y-3">
              {vehicleIssues.slice(0, 3).map((iss) => (
                <div
                  key={iss.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{iss.title}</span>
                    <SeverityBadge severity={iss.severity} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{iss.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                    <span>Reported: {iss.reportedDate} ({formatMileage(iss.reportedMileage, 'Not documented')})</span>
                    <span className="capitalize text-slate-700 dark:text-slate-300 font-semibold">{iss.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Maintenance Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Maintenance Schedule
            </h3>

            <button
              onClick={() => setCurrentScreen('planner')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>View Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {vehicleTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{task.title}</span>
                    <MaintenanceStatusBadge status={task.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Target: {formatMileage(task.dueMileage, 'Not documented')} {task.dueDate ? `• Due ${task.dueDate}` : ''}
                  </p>
                </div>

                <button
                  onClick={() => setCurrentScreen('add-record')}
                  className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-colors shrink-0"
                >
                  Log
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Service History Table Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Recent Service Logs ({vehicleRecords.length})
          </h3>

          <button
            onClick={() => setCurrentScreen('history')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-mono">
                <th className="pb-2">Date / Mileage</th>
                <th className="pb-2">Service Description</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Provider</th>
                <th className="pb-2">Grade</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {vehicleRecords.slice(0, 5).map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-mono">
                    <div className="text-slate-900 dark:text-slate-100 font-bold">{rec.serviceDate || rec.date}</div>
                    <div className="text-[10px] text-slate-500">{formatMileage(rec.mileageIn ?? rec.mileage, 'Not documented')}</div>
                  </td>
                  <td className="py-3 max-w-xs">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{rec.title || rec.workPerformed}</span>
                      {rec.receiptAttached && (
                        <span title="Receipt Attached">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{rec.notes}</p>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {rec.category}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">
                    {getProviderDisplayName(rec.provider)}
                  </td>
                  <td className="py-3">
                    <ConfidenceBadge grade={rec.confidenceGrade} />
                  </td>
                  <td className="py-3">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    {currencySymbol}{(rec.actualDocumentedPayment ?? rec.finalInvoiceTotal ?? rec.totalCost ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
