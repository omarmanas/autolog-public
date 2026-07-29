import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { ToastMessage } from './Toast';

const stylesheet = readFileSync(
  new URL('../../index.css', import.meta.url),
  'utf8'
);

describe('toast interaction behavior', () => {
  it('keeps both the wrapper and visual Card non-interactive', () => {
    const toastCardRule = stylesheet.match(/\.toast-card\s*\{([^}]*)\}/)?.[1];
    const toastSource = readFileSync(
      new URL('./Toast.tsx', import.meta.url),
      'utf8'
    );

    expect(toastSource).toContain('pointer-events-none');
    expect(toastCardRule).toContain('pointer-events: none');
    expect(toastCardRule).not.toContain('pointer-events: auto');
  });

  it('keeps mobile margins and uses the desktop content offset', () => {
    const toastSource = readFileSync(
      new URL('./Toast.tsx', import.meta.url),
      'utf8'
    );
    const desktopRule = stylesheet.match(
      /@media \(min-width: 768px\)\s*\{\s*\.toast-region\s*\{([\s\S]*?)\}\s*\}/
    )?.[1];

    expect(toastSource).toContain('top-4');
    expect(toastSource).toContain('right-4');
    expect(desktopRule).toContain(
      'top: calc(var(--layout-header-height) + var(--space-4))'
    );
    expect(desktopRule).toContain('var(--layout-sidebar-width)');
    expect(desktopRule).toContain('var(--layout-content-max-width)');
    expect(desktopRule).toContain('var(--space-8)');
  });
});

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
