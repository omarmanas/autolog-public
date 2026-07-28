import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog async safety state', () => {
  it('disables confirmation and dismissal while an operation is active', () => {
    const markup = renderToStaticMarkup(
      <ConfirmDialog
        isOpen
        title="Cleanup"
        message="Working"
        isConfirming
        confirmDisabled
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(markup).toContain('Working…');
    expect((markup.match(/disabled=""/g) || [])).toHaveLength(3);
  });
});
