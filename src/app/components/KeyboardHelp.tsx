import { useEffect } from 'react';

import { SHORTCUT_REFERENCE } from '../shortcuts';
import './KeyboardHelp.css';

interface KeyboardHelpProps {
  readonly onClose: () => void;
}

/** The keyboard-shortcut reference overlay (`?`). PROJECT_CORE §3.14. */
export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' || event.key === '?') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  return (
    <div
      className="keyboard-help"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="keyboard-help__card"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="keyboard-help__header">
          <h2 className="keyboard-help__title">Keyboard shortcuts</h2>
          <button
            type="button"
            className="keyboard-help__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="keyboard-help__groups">
          {SHORTCUT_REFERENCE.map((group) => (
            <section key={group.group} className="keyboard-help__group">
              <h3 className="keyboard-help__group-title">{group.group}</h3>
              <dl className="keyboard-help__list">
                {group.items.map((item) => (
                  <div key={item.label} className="keyboard-help__row">
                    <dt className="keyboard-help__keys">{item.keys}</dt>
                    <dd className="keyboard-help__label">{item.label}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
