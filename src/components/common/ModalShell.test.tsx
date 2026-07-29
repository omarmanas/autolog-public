import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { handleModalEscape, ModalShell } from './ModalShell';

describe('ModalShell', () => {
  it('renders an accessible labelled modal', () => {
    const markup = renderToStaticMarkup(
      <ModalShell isOpen title="Vehicle details" onClose={vi.fn()}>
        Modal content
      </ModalShell>
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/aria-labelledby="([^"]+)"/);
    const titleId = markup.match(/<h2[^>]*id="([^"]+)"/)?.[1];
    expect(titleId).toBeTruthy();
    expect(markup).toContain(`aria-labelledby="${titleId}"`);
    expect(markup).toContain('aria-label="Close dialog"');
  });

  it('closes on Escape when enabled', () => {
    const onClose = vi.fn();
    const event = { key: 'Escape', preventDefault: vi.fn() };

    expect(handleModalEscape(event, onClose)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close on Escape when disabled', () => {
    const onClose = vi.fn();
    const event = { key: 'Escape', preventDefault: vi.fn() };

    expect(handleModalEscape(event, onClose, false)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
