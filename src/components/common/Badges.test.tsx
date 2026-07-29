import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ConfidenceBadge,
  IssueStatusBadge,
  MaintenanceStatusBadge,
  SeverityBadge,
  StatusBadge,
} from './Badges';

describe('static status badges', () => {
  it.each([
    ['A', 'Grade A', 'Verified Receipt/Invoice'],
    ['B', 'Grade B', 'Self-Logged w/ Invoice'],
    ['C', 'Grade C', 'Estimated / Third-Party'],
    ['D', 'Grade D', 'Unverified Memory'],
    ['E', 'Grade E', 'Planned / Unverified'],
  ] as const)(
    'preserves confidence grade %s text and description',
    (grade, label, description) => {
      const markup = renderToStaticMarkup(<ConfidenceBadge grade={grade} />);

      expect(markup).toContain(label);
      expect(markup).toContain(`${label}: ${description}`);
    }
  );

  it.each([
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
  ] as const)('preserves record status text: %s', (status) => {
    expect(renderToStaticMarkup(<StatusBadge status={status} />)).toContain(
      status
    );
  });

  it.each(['Low', 'Medium', 'High', 'Critical'] as const)(
    'preserves severity text: %s',
    (severity) => {
      expect(
        renderToStaticMarkup(<SeverityBadge severity={severity} />)
      ).toContain(`${severity} Severity`);
    }
  );

  it.each(['Open', 'Monitoring', 'Scheduled', 'Resolved'] as const)(
    'preserves issue status text: %s',
    (status) => {
      expect(
        renderToStaticMarkup(<IssueStatusBadge status={status} />)
      ).toContain(status);
    }
  );

  it.each(['Overdue', 'Due Soon', 'OK', 'Upcoming'] as const)(
    'preserves maintenance status text: %s',
    (status) => {
      expect(
        renderToStaticMarkup(<MaintenanceStatusBadge status={status} />)
      ).toContain(status);
    }
  );
});
