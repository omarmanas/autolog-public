import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookOpenCheck, Moon, Sun } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../common/Button';
import { BlueprintHeaderButton, ThemeHeaderButton } from './Header';

describe('Header icon controls', () => {
  it('preserves the Project Blueprint callback and exposes a stable name', () => {
    const onClick = vi.fn();
    const view = BlueprintHeaderButton({
      isActive: true,
      onClick,
    }) as React.ReactElement<React.ComponentProps<typeof Button>>;
    const icon = view.props.children as React.ReactElement;
    const event = {} as React.MouseEvent<HTMLButtonElement>;

    view.props.onClick?.(event);

    const markup = renderToStaticMarkup(view);
    expect(view.type).toBe(Button);
    expect(view.props['aria-label']).toBe('Project Blueprint');
    expect(view.props.title).toBe('Project Blueprint');
    expect(view.props['aria-pressed']).toBe(true);
    expect(icon.type).toBe(BookOpenCheck);
    expect(onClick).toHaveBeenCalledExactlyOnceWith(event);
    expect(markup).toContain('aria-label="Project Blueprint"');
  });

  it.each([
    ['light', Moon],
    ['dark', Sun],
    ['system', Moon],
  ] as const)(
    'preserves the %s theme icon, accessible name, and callback',
    (theme, Icon) => {
      const onClick = vi.fn();
      const view = ThemeHeaderButton({
        theme,
        onClick,
      }) as React.ReactElement<React.ComponentProps<typeof Button>>;
      const icon = view.props.children as React.ReactElement;
      const event = {} as React.MouseEvent<HTMLButtonElement>;

      view.props.onClick?.(event);

      const markup = renderToStaticMarkup(view);
      expect(view.type).toBe(Button);
      expect(view.props['aria-label']).toBe('Toggle theme');
      expect(view.props.title).toBe('Toggle theme');
      expect(icon.type).toBe(Icon);
      expect(onClick).toHaveBeenCalledExactlyOnceWith(event);
      expect(markup).toContain('aria-label="Toggle theme"');
      expect(markup).toContain('title="Toggle theme"');
    }
  );
});
