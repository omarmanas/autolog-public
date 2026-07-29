import { describe, expect, it, vi } from 'vitest';
import { applyResolvedTheme } from './AppContext';

const createThemeRoot = () => {
  const classes = new Set<string>();
  const root = {
    classList: {
      add: vi.fn((name: string) => classes.add(name)),
      remove: vi.fn((name: string) => classes.delete(name)),
    },
    dataset: {} as DOMStringMap,
  };

  return { classes, root };
};

describe('root theme state', () => {
  it('applies dark mode through the document class and semantic theme state', () => {
    const { classes, root } = createThemeRoot();

    applyResolvedTheme(
      root as unknown as Pick<HTMLElement, 'classList' | 'dataset'>,
      'dark'
    );

    expect(classes.has('dark')).toBe(true);
    expect(root.dataset.theme).toBe('dark');
  });

  it('fully removes dark mode when light mode resolves', () => {
    const { classes, root } = createThemeRoot();
    classes.add('dark');

    applyResolvedTheme(
      root as unknown as Pick<HTMLElement, 'classList' | 'dataset'>,
      'light'
    );

    expect(classes.has('dark')).toBe(false);
    expect(root.dataset.theme).toBe('light');
  });
});
