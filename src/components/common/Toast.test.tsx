import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ToastMessage } from './Toast';

describe.each([
  ['success', CheckCircle2, 'Saved successfully', 'status'],
  ['info', Info, 'New information', 'status'],
  ['warning', AlertCircle, 'Check this warning', 'status'],
  ['error', XCircle, 'Save failed', 'alert'],
] as const)('ToastMessage %s severity', (type, Icon, message, role) => {
  it('preserves its message, severity icon, and live-region semantics', () => {
    const view = ToastMessage({
      message,
      type,
    }) as React.ReactElement<{ children?: React.ReactNode; role?: string }>;
    const children = React.Children.toArray(view.props.children);
    const icon = children[0] as React.ReactElement;
    const markup = renderToStaticMarkup(view);

    expect(icon.type).toBe(Icon);
    expect(view.props.role).toBe(role);
    expect(markup).toContain(message);
    expect(markup).toContain(`role="${role}"`);
    expect(markup).toContain('aria-atomic="true"');
    expect(markup).not.toContain('<button');
  });
});
