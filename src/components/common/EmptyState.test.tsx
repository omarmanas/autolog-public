import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders its optional action', () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        title="No records"
        description="Add a record to get started."
        action={<Button>Add record</Button>}
      />
    );

    expect(markup).toContain('ui-empty-state');
    expect(markup).toContain('No records');
    expect(markup).toContain('Add a record to get started.');
    expect(markup).toContain('Add record');
  });
});
