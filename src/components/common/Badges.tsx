import React from 'react';
import { ConfidenceGrade, RecordStatus, IssueSeverity, IssueStatus, MaintenanceRuleStatus } from '../../types';

export const ConfidenceBadge: React.FC<{ grade: ConfidenceGrade; showTooltip?: boolean }> = ({ grade }) => {
  const configs: Record<ConfidenceGrade, { bg: string; label: string; sub: string }> = {
    A: { bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400', label: 'Grade A', sub: 'Verified Receipt/Invoice' },
    B: { bg: 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400', label: 'Grade B', sub: 'Self-Logged w/ Invoice' },
    C: { bg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400', label: 'Grade C', sub: 'Estimated / Third-Party' },
    D: { bg: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400', label: 'Grade D', sub: 'Unverified Memory' },
    E: { bg: 'bg-zinc-500/15 border-zinc-500/30 text-zinc-700 dark:text-zinc-400', label: 'Grade E', sub: 'Planned / Unverified' },
  };

  const cfg = configs[grade] || configs.B;

  return (
    <span
      title={`${cfg.label}: ${cfg.sub}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${cfg.bg}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {cfg.label}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: RecordStatus }> = ({ status }) => {
  const configs: Partial<Record<RecordStatus, string>> = {
    Completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    'Diagnostic Only': 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
    'Inspection Only': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    'Parts Purchased': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    'User-Completed': 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
    Recommended: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    Declined: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    Deferred: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    Planned: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    Monitoring: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
    'Completion Unverified': 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
    'Mileage Observation': 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20',
    'Administrative Only': 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  };

  const styling = configs[status] || 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styling}`}>
      {status}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: IssueSeverity }> = ({ severity }) => {
  const configs: Record<IssueSeverity, string> = {
    Low: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/20',
    Medium: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    High: 'bg-orange-500/15 text-orange-800 dark:text-orange-400 border-orange-500/30',
    Critical: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 font-bold animate-pulse',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${configs[severity]}`}>
      {severity} Severity
    </span>
  );
};

export const IssueStatusBadge: React.FC<{ status: IssueStatus }> = ({ status }) => {
  const configs: Record<IssueStatus, string> = {
    Open: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    Monitoring: 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30',
    Scheduled: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30',
    Resolved: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${configs[status]}`}>
      {status}
    </span>
  );
};

export const MaintenanceStatusBadge: React.FC<{ status: MaintenanceRuleStatus }> = ({ status }) => {
  const configs: Record<MaintenanceRuleStatus, string> = {
    Overdue: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold',
    'Due Soon': 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border-amber-500/30',
    OK: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/30',
    Upcoming: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${configs[status]}`}>
      {status}
    </span>
  );
};
