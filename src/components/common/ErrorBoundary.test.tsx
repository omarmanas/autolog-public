import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { ErrorBoundaryFallback } from './ErrorBoundary';

const findButtons = (
  node: React.ReactNode
): React.ReactElement<React.ComponentProps<typeof Button>>[] => {
  if (Array.isArray(node)) {
    return node.flatMap(findButtons);
  }

  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return [];
  }

  const matches =
    node.type === Button
      ? [
          node as React.ReactElement<React.ComponentProps<typeof Button>>,
        ]
      : [];

  return [...matches, ...findButtons(node.props.children)];
};

describe('ErrorBoundaryFallback', () => {
  it('preserves diagnostic content and forwards retry and reload actions', () => {
    const onReset = vi.fn();
    const onReload = vi.fn();
    const view = ErrorBoundaryFallback({
      error: new Error('Render failure'),
      onReset,
      onReload,
    }) as React.ReactElement<{ children?: React.ReactNode }>;
    const buttons = findButtons(view);
    const event = {} as React.MouseEvent<HTMLButtonElement>;

    buttons[0].props.onClick?.(event);
    buttons[1].props.onClick?.(event);

    const markup = renderToStaticMarkup(view);
    expect(markup).toContain('Something went wrong');
    expect(markup).toContain('Error: Render failure');
    expect(markup).toContain('Try Again');
    expect(markup).toContain('Reload Page');
    expect(onReset).toHaveBeenCalledExactlyOnceWith(event);
    expect(onReload).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('omits diagnostic output when no error is available', () => {
    const markup = renderToStaticMarkup(
      <ErrorBoundaryFallback
        error={null}
        onReset={vi.fn()}
        onReload={vi.fn()}
      />
    );

    expect(markup).toContain('Something went wrong');
    expect(markup).not.toContain('Error:');
  });
});
