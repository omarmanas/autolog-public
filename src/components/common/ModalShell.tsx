import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const handleModalEscape = (
  event: Pick<KeyboardEvent, 'key' | 'preventDefault'>,
  onClose: () => void,
  enabled = true
) => {
  if (!enabled || event.key !== 'Escape') return false;

  event.preventDefault();
  onClose();
  return true;
};

export const restoreModalFocus = (
  previouslyFocused: Pick<HTMLElement, 'focus'> | null,
  enabled = true
) => {
  if (!enabled || !previouslyFocused) return false;

  previouslyFocused.focus();
  return true;
};

export const handleModalOverlayMouseDown = (
  event: Pick<React.MouseEvent<HTMLDivElement>, 'target' | 'currentTarget'>,
  onClose: () => void,
  enabled = true
) => {
  if (!enabled || event.target !== event.currentTarget) return false;

  onClose();
  return true;
};

export const PASSIVE_MODAL_BEHAVIOR = {
  closeOnEscape: false,
  closeOnOverlayClick: false,
  autoFocus: false,
  trapFocus: false,
  restoreFocus: false,
} as const;

export interface ModalShellProps {
  isOpen: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  autoFocus?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  className?: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  title,
  children,
  onClose,
  footer,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  initialFocusRef,
  autoFocus = true,
  trapFocus = true,
  restoreFocus = true,
  className = '',
}) => {
  const titleId = `modal-title-${useId()}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = dialogRef.current;
    if (autoFocus) {
      const focusTarget =
        initialFocusRef?.current ||
        dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ||
        dialog;

      focusTarget?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (handleModalEscape(event, onCloseRef.current, closeOnEscape)) return;
      if (!trapFocus || event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreModalFocus(previouslyFocused, restoreFocus);
    };
  }, [
    autoFocus,
    closeOnEscape,
    initialFocusRef,
    isOpen,
    restoreFocus,
    trapFocus,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-overlay"
      onMouseDown={(event) => {
        handleModalOverlayMouseDown(event, onClose, closeOnOverlayClick);
      }}
    >
      <div
        ref={dialogRef}
        className={['ui-modal', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="ui-modal__header">
          <h2 className="ui-modal__title" id={titleId}>
            {title}
          </h2>
          {showCloseButton && (
            <Button
              variant="ghost"
              iconOnly
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X aria-hidden="true" size={20} />
            </Button>
          )}
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
};
