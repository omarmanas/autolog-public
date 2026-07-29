import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button, ButtonVariant } from './Button';

describe('Button', () => {
  it.each<ButtonVariant>(['primary', 'secondary', 'ghost', 'destructive'])(
    'renders the %s variant',
    (variant) => {
      const markup = renderToStaticMarkup(
        <Button variant={variant}>{variant}</Button>
      );

      expect(markup).toContain(`ui-button--${variant}`);
      expect(markup).toContain('type="button"');
    }
  );

  it('exposes an accessible loading state and disables interaction', () => {
    const markup = renderToStaticMarkup(
      <Button loading loadingText="Saving changes">
        Save
      </Button>
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Saving changes');
    expect(markup).not.toContain('>Save<');
  });

  it('supports an accessible name for icon-only buttons', () => {
    const markup = renderToStaticMarkup(
      <Button iconOnly aria-label="Open options">
        <span aria-hidden="true">⋯</span>
      </Button>
    );

    expect(markup).toContain('aria-label="Open options"');
    expect(markup).toContain('ui-button--icon-only');
  });
});
