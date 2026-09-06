import { useEffect } from 'react';

import { SHORTCUT_REFERENCE } from '../shortcuts';
import { Dialog } from './Dialog';
import './KeyboardHelp.css';

interface KeyboardHelpProps {
  readonly onClose: () => void;
}

/** The keyboard-shortcut reference overlay (`?`). PROJECT_CORE §3.14, §17. */
export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === '?') {
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
    <Dialog title="Keyboard shortcuts" size="lg" onClose={onClose}>
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
    </Dialog>
  );
}
