import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  handleModalEscape,
  handleModalOverlayMouseDown,
  ModalShell,
  PASSIVE_MODAL_BEHAVIOR,
  restoreModalFocus,
} from './ModalShell';

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

  it('restores focus only when enabled', () => {
    const previouslyFocused = { focus: vi.fn() };

    expect(restoreModalFocus(previouslyFocused, false)).toBe(false);
    expect(previouslyFocused.focus).not.toHaveBeenCalled();

    expect(restoreModalFocus(previouslyFocused)).toBe(true);
    expect(previouslyFocused.focus).toHaveBeenCalledOnce();
  });

  it('preserves passive legacy close and focus behavior', () => {
    const onClose = vi.fn();
    const target = {};
    const event = {
      target,
      currentTarget: target,
    } as Pick<
      React.MouseEvent<HTMLDivElement>,
      'target' | 'currentTarget'
    >;
    const escapeEvent = { key: 'Escape', preventDefault: vi.fn() };

    expect(
      handleModalEscape(
        escapeEvent,
        onClose,
        PASSIVE_MODAL_BEHAVIOR.closeOnEscape
      )
    ).toBe(false);
    expect(
      handleModalOverlayMouseDown(
        event,
        onClose,
        PASSIVE_MODAL_BEHAVIOR.closeOnOverlayClick
      )
    ).toBe(false);
    expect(PASSIVE_MODAL_BEHAVIOR.autoFocus).toBe(false);
    expect(PASSIVE_MODAL_BEHAVIOR.trapFocus).toBe(false);
    expect(PASSIVE_MODAL_BEHAVIOR.restoreFocus).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
