import React, { type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { PwaUpdateNotice } from './PwaUpdatePrompt';

interface ElementProps {
  children?: ReactNode;
  onClick?: () => void;
}

const findButtons = (node: ReactNode, buttons: ReactElement<ElementProps>[] = []) => {
  if (!React.isValidElement<ElementProps>(node)) {
    return buttons;
  }

  if (node.type === Button) {
    buttons.push(node);
  }

  React.Children.forEach(node.props.children, (child) =>
    findButtons(child, buttons)
  );
  return buttons;
};

describe('PWA update notice', () => {
  it('provides an accessible, non-modal update and defer choice', () => {
    const markup = renderToStaticMarkup(
      <PwaUpdateNotice onUpdate={() => undefined} onLater={() => undefined} />
    );

    expect(markup).toContain('aria-label="Application update"');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('A new AutoLog version is available.');
    expect(markup).toContain('Update now');
    expect(markup).toContain('Later');
    expect(markup).not.toContain('autofocus');
    expect(markup).not.toContain('role="dialog"');
  });

  it('forwards explicit update and defer actions without automatic activation', () => {
    const onUpdate = vi.fn();
    const onLater = vi.fn();
    const view = PwaUpdateNotice({ onUpdate, onLater }) as ReactNode;
    const buttons = findButtons(view);

    expect(onUpdate).not.toHaveBeenCalled();
    expect(buttons).toHaveLength(2);

    buttons[0].props.onClick?.();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onLater).not.toHaveBeenCalled();

    buttons[1].props.onClick?.();
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});
