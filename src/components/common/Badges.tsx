import React from 'react';
import { ConfidenceGrade, RecordStatus, IssueSeverity, IssueStatus, MaintenanceRuleStatus } from '../../types';

type BadgeTone = 'success' | 'info' | 'warning' | 'error' | 'accent' | 'neutral';

const badgeClass = (tone: BadgeTone, className = '') =>
  ['ui-badge', `ui-badge--${tone}`, className].filter(Boolean).join(' ');

export const ConfidenceBadge: React.FC<{ grade: ConfidenceGrade; showTooltip?: boolean }> = ({ grade }) => {
  const configs: Record<ConfidenceGrade, { tone: BadgeTone; label: string; sub: string }> = {
    A: { tone: 'success', label: 'Grade A', sub: 'Verified Receipt/Invoice' },
    B: { tone: 'info', label: 'Grade B', sub: 'Self-Logged w/ Invoice' },
    C: { tone: 'warning', label: 'Grade C', sub: 'Estimated / Third-Party' },
    D: { tone: 'error', label: 'Grade D', sub: 'Unverified Memory' },
    E: { tone: 'neutral', label: 'Grade E', sub: 'Planned / Unverified' },
  };

  const cfg = configs[grade] || configs.B;

  return (
    <span
      title={`${cfg.label}: ${cfg.sub}`}
      className={badgeClass(cfg.tone, 'gap-1 font-semibold')}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {cfg.label}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: RecordStatus }> = ({ status }) => {
  const configs: Partial<Record<RecordStatus, BadgeTone>> = {
    Completed: 'success',
    'Diagnostic Only': 'info',
    'Inspection Only': 'info',
    'Parts Purchased': 'accent',
    'User-Completed': 'success',
    Recommended: 'warning',
    Declined: 'error',
    Deferred: 'warning',
    Planned: 'accent',
    Monitoring: 'info',
    'Completion Unverified': 'neutral',
    'Mileage Observation': 'neutral',
    'Administrative Only': 'neutral',
  };

  const tone = configs[status] || 'success';

  return (
    <span className={badgeClass(tone)}>
      {status}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: IssueSeverity }> = ({ severity }) => {
  const configs: Record<IssueSeverity, { tone: BadgeTone; className?: string }> = {
    Low: { tone: 'neutral' },
    Medium: { tone: 'warning' },
    High: { tone: 'error' },
    Critical: { tone: 'error', className: 'font-bold animate-pulse' },
  };
  const config = configs[severity];

  return (
    <span className={badgeClass(config.tone, config.className)}>
      {severity} Severity
    </span>
  );
};

export const IssueStatusBadge: React.FC<{ status: IssueStatus }> = ({ status }) => {
  const configs: Record<IssueStatus, BadgeTone> = {
    Open: 'warning',
    Monitoring: 'info',
    Scheduled: 'accent',
    Resolved: 'success',
  };

  return (
    <span className={badgeClass(configs[status])}>
      {status}
    </span>
  );
};

export const MaintenanceStatusBadge: React.FC<{ status: MaintenanceRuleStatus }> = ({ status }) => {
  const configs: Record<MaintenanceRuleStatus, { tone: BadgeTone; className?: string }> = {
    Overdue: { tone: 'error', className: 'font-semibold' },
    'Due Soon': { tone: 'warning' },
    OK: { tone: 'success' },
    Upcoming: { tone: 'neutral' },
  };
  const config = configs[status];

  return (
    <span className={badgeClass(config.tone, config.className)}>
      {status}
    </span>
  );
};
