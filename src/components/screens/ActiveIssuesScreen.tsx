import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { IssueSeverity, IssueStatus, ActiveIssue } from '../../types';
import { SeverityBadge, IssueStatusBadge } from '../common/Badges';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { formatMileage } from '../../utils/formatters';
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Calendar,
  X,
  Gauge,
  Tag,
  Wrench,
  Edit,
  Trash2,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

export function parseOptionalIssueMileage(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export const ActiveIssuesScreen: React.FC = () => {
  const {
    issues,
    vehicles,
    activeVehicle,
    addIssue,
    updateIssue,
    resolveIssue,
    deleteIssue,
    currencySymbol,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<ActiveIssue | null>(null);
  const [deletingIssueId, setDeletingIssueId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const submitLockRef = useRef(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  // Form states
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('Medium');
  const [status, setStatus] = useState<IssueStatus>('Open');
  const [reportedDate, setReportedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportedMileage, setReportedMileage] = useState(
    activeVehicle.currentMileage.toString()
  );
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('50.00');
  const [tagsInput, setTagsInput] = useState('squeak, noise');

  const vehicleIssues = issues.filter((i) => i.vehicleId === activeVehicle.id);

  const filteredIssues = vehicleIssues.filter((iss) => {
    if (selectedSeverity === 'ALL') return true;
    return iss.severity === selectedSeverity;
  });

  const openAddModal = () => {
    setEditingIssue(null);
    setTitle('');
    setSeverity('Medium');
    setStatus('Open');
    setReportedDate(new Date().toISOString().split('T')[0]);
    setReportedMileage(activeVehicle.currentMileage.toString());
    setDescription('');
    setEstimatedCost('50.00');
    setTagsInput('squeak, noise');
    setShowModal(true);
  };

  const openEditModal = (issue: ActiveIssue) => {
    setEditingIssue(issue);
    setTitle(issue.title);
    setSeverity(issue.severity);
    setStatus(issue.status);
    setReportedDate(issue.reportedDate);
    setReportedMileage(
      issue.reportedMileage !== undefined ? issue.reportedMileage.toString() : ''
    );
    setDescription(issue.description);
    setEstimatedCost(issue.estimatedCost ? issue.estimatedCost.toString() : '0');
    setTagsInput(issue.tags ? issue.tags.join(', ') : '');
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || submitLockRef.current) return;
    const normalizedMileage = parseOptionalIssueMileage(reportedMileage);
    if (reportedMileage.trim() !== '' && normalizedMileage === undefined) return;
    submitLockRef.current = true;
    setIsSubmitting(true);

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      if (editingIssue) {
        await updateIssue({
          ...editingIssue,
          title,
          severity,
          status,
          reportedDate,
          reportedMileage: normalizedMileage,
          description,
          estimatedCost: Math.max(0, Number(estimatedCost) || 0),
          tags: tagsArray,
        });
      } else {
        await addIssue({
          vehicleId: activeVehicle.id,
          title,
          severity,
          status,
          reportedDate,
          reportedMileage: normalizedMileage,
          description,
          estimatedCost: Math.max(0, Number(estimatedCost) || 0),
          tags: tagsArray,
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
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span>Active Defects & Issue Tracking</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor mechanical squeaks, warning lights, and pending repair items for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {activeVehicle.year} {activeVehicle.make} {activeVehicle.model}
            </span>.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Report New Issue</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>Filter Severity:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold"
          >
            <option value="ALL">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="text-xs font-mono font-semibold text-slate-500">
          Showing {filteredIssues.length} issues
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-sm">No active issues found</h3>
            <p className="text-xs text-slate-500 mt-1">All vehicle systems are currently operating cleanly!</p>
          </div>
        ) : (
          filteredIssues.map((iss) => (
            <div
              key={iss.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-3 transition-all ${
                iss.status === 'Resolved'
                  ? 'border-slate-200 dark:border-slate-800 opacity-75'
                  : 'border-amber-500/30 dark:border-amber-500/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={iss.severity} />
                    <IssueStatusBadge status={iss.status} />
                    <span className="font-mono text-[11px] text-slate-500">
                      Reported: {iss.reportedDate} ({formatMileage(iss.reportedMileage, 'Not documented')})
                    </span>
                  </div>

                  <h3 className="text-base font-bold">{iss.title}</h3>
                </div>

                <div className="flex items-center gap-2 self-start shrink-0">
                  {iss.status !== 'Resolved' && (
                    <button
                      onClick={() => {
                        void resolveIssue(iss.id, iss.title).catch(() => undefined);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolve</span>
                    </button>
                  )}

                  <button
                    onClick={() => openEditModal(iss)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Edit Issue"
                  >
                    <Edit className="w-4 h-4 text-indigo-500" />
                  </button>

                  <button
                    onClick={() => setDeletingIssueId(iss.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                    title="Delete Issue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {iss.description}
              </p>

              <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Repair Cost:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {currencySymbol}{(iss.estimatedCost || 0).toFixed(2)}
                  </span>
                </div>

                {iss.tags && iss.tags.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    {iss.tags.map((t, idx) => (
                      <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-[10px] font-mono px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>{editingIssue ? 'Edit Issue' : 'Report Active Issue / Defect'}</span>
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
                <label className="block font-bold mb-1">Issue Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Squeaking noise when turning left, Check Engine Light P0300"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Severity *</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Low">Low (Cosmetic / Minor)</option>
                    <option value="Medium">Medium (Attention Soon)</option>
                    <option value="High">High (Immediate Repair)</option>
                    <option value="Critical">Critical (Do Not Drive)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as IssueStatus)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Open">Open</option>
                    <option value="Investigating">Investigating</option>
                    <option value="Parts Ordered">Parts Ordered</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Reported Date</label>
                  <input
                    type="date"
                    value={reportedDate}
                    onChange={(e) => setReportedDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Reported Mileage (mi)</label>
                  <input
                    type="number"
                    min="0"
                  value={reportedMileage}
                  onChange={(e) => setReportedMileage(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Estimated Repair Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-amber-600"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Detailed Symptoms & Notes</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when the noise occurs, DTC error codes, steps to reproduce..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. brakes, noise, dtc"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'Saving…'
                    : editingIssue
                      ? 'Update Issue'
                      : 'Report Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingIssueId)}
        title="Delete Active Issue"
        message="Are you sure you want to delete this issue entry?"
        confirmText="Yes, Delete Issue"
        isConfirming={isDeleting}
        onConfirm={async () => {
          if (!deletingIssueId || isDeleting) return;
          setIsDeleting(true);
          try {
            await deleteIssue(deletingIssueId);
            setDeletingIssueId(null);
          } catch {
            // AppContext surfaces the persistence failure.
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setDeletingIssueId(null)}
      />
    </div>
  );
};
