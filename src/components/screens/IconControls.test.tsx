import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../common/Button';
import { IssueEditButton } from './ActiveIssuesScreen';
import { DocumentViewButton } from './DocumentsScreen';
import { PlanEditButton } from './MaintenancePlannerScreen';
import { RecordEditButton } from './ServiceHistoryScreen';

type IconControl = React.FC<{
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}>;

describe.each([
  ['document view', DocumentViewButton, 'View / Download File'],
  ['issue edit', IssueEditButton, 'Edit Issue'],
  ['plan edit', PlanEditButton, 'Edit Plan'],
  ['record edit', RecordEditButton, 'Edit Record'],
] as const)('%s icon control', (_label, Control, accessibleName) => {
  it('preserves its accessible name, tooltip, and callback', () => {
    const onClick = vi.fn();
    const view = (Control as IconControl)({ onClick }) as React.ReactElement<
      React.ComponentProps<typeof Button>
    >;
    const event = {} as React.MouseEvent<HTMLButtonElement>;

    view.props.onClick?.(event);

    const markup = renderToStaticMarkup(view);
    expect(view.type).toBe(Button);
    expect(view.props.iconOnly).toBe(true);
    expect(view.props['aria-label']).toBe(accessibleName);
    expect(view.props.title).toBe(accessibleName);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(event);
    expect(markup).toContain(`aria-label="${accessibleName}"`);
    expect(markup).toContain(`title="${accessibleName}"`);
  });
});
