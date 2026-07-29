import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../common/Button';
import { EmptyState } from '../common/EmptyState';
import { ServiceHistoryEmptyState } from './ServiceHistoryScreen';

describe('ServiceHistoryEmptyState', () => {
  it('renders through EmptyState and preserves the reset action', () => {
    const onResetFilters = vi.fn();
    const view = ServiceHistoryEmptyState({ onResetFilters }) as React.ReactElement<
      React.ComponentProps<typeof EmptyState>
    >;
    const action = view.props.action as React.ReactElement<
      React.ComponentProps<typeof Button>
    >;

    expect(view.type).toBe(EmptyState);
    expect(action.type).toBe(Button);

    action.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);

    expect(onResetFilters).toHaveBeenCalledOnce();
    expect(renderToStaticMarkup(view)).toContain('Reset Filters');
  });
});
