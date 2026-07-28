import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMileage } from '../../utils/formatters';
import { calculateCostAnalytics } from '../../utils/costAnalytics';
import {
  BarChart3,
  DollarSign,
  PieChart,
  Gauge,
  TrendingUp,
  Wrench,
  ShieldCheck,
  Tag,
  Calendar,
  Layers,
} from 'lucide-react';

export const CostsScreen: React.FC = () => {
  const { records, vehicles, activeVehicle, currencySymbol } = useApp();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');

  const {
    targetRecordsCount,
    totalSpent,
    totalParts,
    totalLabor,
    selectedMileage,
    costPerMile,
    categoryTotals,
    yearTotals,
  } = calculateCostAnalytics(records, vehicles, selectedVehicleId);
  const orphanCount = selectedVehicleId === 'ALL' ? records.length - targetRecordsCount : 0;

  const sortedYears = Object.keys(yearTotals).sort().reverse();

  return (
    <div className="space-y-6 pb-20 md:pb-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Cost & Financial Expenditure Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Valid expense totals filtered for completed & performed maintenance logs.
            {orphanCount > 0 && (
              <span className="block text-slate-400 mt-0.5 italic">
                ({orphanCount} orphan record{orphanCount > 1 ? 's' : ''} excluded from fleet analytics)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Scope:</span>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 font-bold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="ALL">All Fleet Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase">Total Actual Documented Spend</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {currencySymbol}{totalSpent.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            Across {targetRecordsCount} in-scope records
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase">Cost Per Odometer Mile</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {currencySymbol}{costPerMile} <span className="text-xs font-normal text-slate-400">/mi</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Odometer: {selectedVehicleId === 'ALL' ? 'Fleet Total ' : ''}{formatMileage(selectedMileage, 'Not documented')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase">Parts Investment</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {currencySymbol}{totalParts.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            {((totalParts / Math.max(1, totalSpent)) * 100).toFixed(0)}% of total expenditure
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase">Labor Expenses</div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
            {currencySymbol}{totalLabor.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            {((totalLabor / Math.max(1, totalSpent)) * 100).toFixed(0)}% of total expenditure
          </div>
        </div>
      </div>

      {/* Breakdown by Category & Year */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Summary by Category */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" />
            <span>Expenditure by Category</span>
          </h3>

          <div className="space-y-3">
            {Object.keys(categoryTotals).length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">No completed spending logs found.</p>
            ) : (
              Object.entries(categoryTotals).map(([cat, amount]) => {
                const pct = (amount / Math.max(1, totalSpent)) * 100;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                      <span className="font-mono font-bold">
                        {currencySymbol}{amount.toFixed(2)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expense Summary by Year */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Annual Expenditure Summary</span>
          </h3>

          <div className="space-y-3">
            {sortedYears.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">No annual spending logs found.</p>
            ) : (
              sortedYears.map((yearStr) => {
                const amount = yearTotals[yearStr];
                const pct = (amount / Math.max(1, totalSpent)) * 100;
                return (
                  <div key={yearStr} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-extrabold">{yearStr} Annual Total</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {currencySymbol}{amount.toFixed(2)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
