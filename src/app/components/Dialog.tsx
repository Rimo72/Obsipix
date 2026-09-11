import { useEffect, useId, useRef, type ReactNode } from 'react';

import './Dialog.css';

interface DialogProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  /** Optional action row rendered at the bottom. */
  readonly footer?: ReactNode;
  /** Width preset. */
  readonly size?: 'sm' | 'md' | 'lg' | 'xl';
}

const FOCUSABLE_PARTS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
];
const FOCUSABLE = FOCUSABLE_PARTS.join(', ');
const scoped = (prefix: string): string =>
  FOCUSABLE_PARTS.map((part) => `${prefix} ${part}`).join(', ');

/**
 * The shared modal primitive (PROJECT_CORE §17): a labelled `role="dialog"`,
 * focus trapped inside, Escape and backdrop-click to close, and focus restored
 * to whatever was focused before it opened.
 */
export function Dialog({ title, onClose, children, footer, size = 'sm' }: DialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    // Prefer the first real control in the body; fall back to the card itself.
    const target =
      card?.querySelector<HTMLElement>(scoped('.dialog__body')) ??
      card?.querySelector<HTMLElement>(scoped('.dialog__footer')) ??
      card;
    target?.focus();

    return () => {
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const card = cardRef.current;
      if (!card) {
        return;
      }
      const focusable = [...card.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !card.contains(active))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  return (
    <div
      className="dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={cardRef}
        className={`dialog dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="dialog__header">
          <h2 id={titleId} className="dialog__title">
            {title}
          </h2>
          <button type="button" className="dialog__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer !== undefined && <div className="dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}
