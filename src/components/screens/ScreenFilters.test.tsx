import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FormControl } from '../common/FormControl';
import { IssueSeverityFilterCard } from './ActiveIssuesScreen';
import { DocumentsFilterCard } from './DocumentsScreen';

const getFilterSelect = (
  view: React.ReactElement<{ children?: React.ReactNode }>
): React.ReactElement<
  React.SelectHTMLAttributes<HTMLSelectElement>
> => {
  const children = React.Children.toArray(view.props.children);
  const formControl = children.find(
    (child) => React.isValidElement(child) && child.type === FormControl
  ) as React.ReactElement<React.ComponentProps<typeof FormControl>>;

  return formControl.props.children as React.ReactElement<
    React.SelectHTMLAttributes<HTMLSelectElement>
  >;
};

describe('migrated screen filters', () => {
  it('preserves the Documents category callback and result count', () => {
    const onCategoryChange = vi.fn();
    const view = DocumentsFilterCard({
      selectedCategory: 'Invoice',
      onCategoryChange,
      resultCount: 3,
    }) as React.ReactElement<{ children?: React.ReactNode }>;
    const select = getFilterSelect(view);
    const event = {
      target: { value: 'Warranty' },
    } as React.ChangeEvent<HTMLSelectElement>;

    select.props.onChange?.(event);

    const markup = renderToStaticMarkup(view);
    expect(onCategoryChange).toHaveBeenCalledExactlyOnceWith(event);
    expect(markup).toContain('Filter Category:');
    expect(markup).toContain('value="Invoice" selected=""');
    expect(markup).toContain('Showing 3 files');
  });

  it('preserves the Active Issues severity callback and options', () => {
    const onSeverityChange = vi.fn();
    const view = IssueSeverityFilterCard({
      selectedSeverity: 'High',
      onSeverityChange,
      resultCount: 2,
    }) as React.ReactElement<{ children?: React.ReactNode }>;
    const select = getFilterSelect(view);
    const event = {
      target: { value: 'Critical' },
    } as React.ChangeEvent<HTMLSelectElement>;

    select.props.onChange?.(event);

    const markup = renderToStaticMarkup(view);
    expect(onSeverityChange).toHaveBeenCalledExactlyOnceWith(event);
    expect(markup).toContain('Filter Severity:');
    expect(markup).toContain('value="High" selected=""');
    expect(markup).toContain('Critical');
    expect(markup).toContain('Showing 2 issues');
  });
});
