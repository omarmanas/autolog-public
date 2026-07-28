import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MaintenancePlan, MaintenanceRuleStatus } from '../../types';
import { MaintenanceStatusBadge } from '../common/Badges';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  CalendarCheck,
  Gauge,
  Plus,
  Clock,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Edit,
  Trash2,
  X,
} from 'lucide-react';

export const MaintenancePlannerScreen: React.FC = () => {
  const {
    maintenanceTasks,
    activeVehicle,
    addMaintenanceTask,
    updateMaintenanceTask,
    deleteMaintenanceTask,
    setCurrentScreen,
    currencySymbol,
  } = useApp();

  const [monthlyMileageEstimate, setMonthlyMileageEstimate] = useState<number>(1000);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const submitLockRef = useRef(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Oil & Filter');
  const [intervalMiles, setIntervalMiles] = useState(7500);
  const [intervalMonths, setIntervalMonths] = useState(6);
  const [dueMileage, setDueMileage] = useState(activeVehicle.currentMileage + 7500);
  const [dueDate, setDueDate] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('85.00');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MaintenanceRuleStatus>('Due Soon');

  const vehicleTasks = maintenanceTasks.filter((t) => t.vehicleId === activeVehicle.id);

  const openAddModal = () => {
    setEditingPlan(null);
    setTitle('');
    setCategory('Oil & Filter');
    setIntervalMiles(7500);
    setIntervalMonths(6);
    setDueMileage(activeVehicle.currentMileage + 7500);
    setDueDate('');
    setEstimatedCost('85.00');
    setDescription('');
    setStatus('Due Soon');
    setShowModal(true);
  };

  const openEditModal = (plan: MaintenancePlan) => {
    setEditingPlan(plan);
    setTitle(plan.title);
    setCategory(plan.category);
    setIntervalMiles(plan.intervalMiles);
    setIntervalMonths(plan.intervalMonths || 6);
    setDueMileage(plan.dueMileage);
    setDueDate(plan.dueDate || '');
    setEstimatedCost(plan.estimatedCost ? plan.estimatedCost.toString() : '0');
    setDescription(plan.description || '');
    setStatus(plan.status);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      if (editingPlan) {
        await updateMaintenanceTask({
          ...editingPlan,
          title,
          category,
          intervalMiles: Number(intervalMiles) || 5000,
          intervalMonths: Number(intervalMonths) || 6,
          dueMileage: Number(dueMileage) || activeVehicle.currentMileage + 5000,
          dueDate: dueDate || undefined,
          estimatedCost: Math.max(0, Number(estimatedCost) || 0),
          description,
          status,
        });
      } else {
        await addMaintenanceTask({
          vehicleId: activeVehicle.id,
          title,
          category,
          intervalMiles: Number(intervalMiles) || 5000,
          intervalMonths: Number(intervalMonths) || 6,
          dueMileage: Number(dueMileage) || activeVehicle.currentMileage + 5000,
          dueDate: dueDate || undefined,
          estimatedCost: Math.max(0, Number(estimatedCost) || 0),
          description,
          status,
          isSampleData: false,
        });
      }
      setShowModal(false);
    } catch {
      // AppContext surfaces the persistence failure and the form stays open.
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Preventative Maintenance Planner</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Distance & interval-based service rules for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
            </span>{' '}
            (Odometer: {(activeVehicle?.currentMileage ?? 0).toLocaleString()} mi).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Plan</span>
          </button>
        </div>
      </div>

      {/* Projection Calculator Card */}
      <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-lg border border-indigo-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-indigo-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Interactive Mileage Projection Engine</h3>
              <p className="text-xs text-indigo-200">
                Adjust estimated monthly driving distance to forecast service dates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-indigo-950/70 p-2 rounded-xl border border-indigo-700/50">
            <span className="text-xs font-semibold text-indigo-200">Driving rate:</span>
            <input
              type="number"
              min="100"
              value={monthlyMileageEstimate}
              onChange={(e) => setMonthlyMileageEstimate(Number(e.target.value) || 500)}
              className="w-20 bg-indigo-900 text-white font-mono font-bold text-xs p-1 rounded text-center border border-indigo-600 focus:outline-none"
            />
            <span className="text-xs text-indigo-300 font-mono">mi/month</span>
          </div>
        </div>
      </div>

      {/* Tasks Table & Cards */}
      <div className="space-y-4">
        {vehicleTasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
            <CalendarCheck className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-sm">No Maintenance Plans Defined</h3>
            <p className="text-xs text-slate-500">
              Create a custom maintenance schedule for oil changes, tire rotations, or spark plugs.
            </p>
          </div>
        ) : (
          vehicleTasks.map((task) => {
            const milesRemaining = task.dueMileage - activeVehicle.currentMileage;
            const monthsRemaining = Math.max(
              0,
              Math.round(milesRemaining / Math.max(100, monthlyMileageEstimate))
            );
            const isOverdue = milesRemaining <= 0;

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-3 transition-all ${
                  isOverdue
                    ? 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/5'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MaintenanceStatusBadge status={task.status} />
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {task.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Interval: Every {(task.intervalMiles ?? 0).toLocaleString()} mi
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {task.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left sm:text-right font-mono">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Target Mileage</div>
                      <div
                        className={`text-base font-black ${
                          isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {(task.dueMileage ?? 0).toLocaleString()} mi
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Edit Plan"
                      >
                        <Edit className="w-4 h-4 text-indigo-500" />
                      </button>

                      <button
                        onClick={() => setDeletingPlanId(task.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setCurrentScreen('add-record')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-colors"
                      >
                        Log Performed
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400">{task.description}</p>

                {/* Progress Bar & Forecast */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-mono">
                    <span>
                      {isOverdue ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Overdue by {Math.abs(milesRemaining).toLocaleString()} mi
                        </span>
                      ) : (
                        <span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {milesRemaining.toLocaleString()} mi
                          </span>{' '}
                          remaining
                        </span>
                      )}
                    </span>

                    <span className="text-slate-500">
                      Projected due in:{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {monthsRemaining} month(s)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
                <span>{editingPlan ? 'Edit Maintenance Plan' : 'Create Maintenance Plan'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Maintenance Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine Oil & Filter Change, Tire Rotation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MaintenanceRuleStatus)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="OK">OK</option>
                    <option value="Due Soon">Due Soon</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Upcoming">Upcoming</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Interval Miles</label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={intervalMiles}
                    onChange={(e) => setIntervalMiles(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Interval Months</label>
                  <input
                    type="number"
                    min="1"
                    value={intervalMonths}
                    onChange={(e) => setIntervalMonths(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Target Due Mileage (mi) *</label>
                  <input
                    type="number"
                    min="0"
                    value={dueMileage}
                    onChange={(e) => setDueMileage(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Estimated Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Plan Notes & Factory Recommendations</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Follow the manufacturer interval and fluid specification..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'Saving…'
                    : editingPlan
                      ? 'Update Plan'
                      : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={Boolean(deletingPlanId)}
        title="Delete Maintenance Plan"
        message="Are you sure you want to delete this maintenance schedule?"
        confirmText="Yes, Delete Plan"
        isConfirming={isDeleting}
        onConfirm={async () => {
          if (!deletingPlanId || isDeleting) return;
          setIsDeleting(true);
          try {
            await deleteMaintenanceTask(deletingPlanId);
            setDeletingPlanId(null);
          } catch {
            // AppContext surfaces the persistence failure.
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setDeletingPlanId(null)}
      />
    </div>
  );
};
