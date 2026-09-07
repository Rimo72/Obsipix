import type { CSSProperties, ReactNode } from 'react';

import './Panel.css';

interface PanelProps {
  readonly id: string;
  readonly title: string;
  readonly collapsed: boolean;
  readonly onToggleCollapse: () => void;
  /** Omit for panels that cannot be closed. */
  readonly onClose?: () => void;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * A dockable editor panel (PROJECT_CORE §111.3, §111.11): a consistent header
 * with a collapse control and an optional close control, plus a body that
 * scrolls its own overflow (§111.10). Layout state lives outside the document.
 */
export function Panel({
  id,
  title,
  collapsed,
  onToggleCollapse,
  onClose,
  children,
  className,
  style,
}: PanelProps) {
  return (
    <section
      className={className ? `panel ${className}` : 'panel'}
      style={style}
      aria-label={title}
      data-panel={id}
      data-collapsed={collapsed || undefined}
    >
      <div className="panel__header">
        <button
          type="button"
          className="panel__toggle"
          aria-expanded={!collapsed}
          aria-controls={`panel-body-${id}`}
          onClick={onToggleCollapse}
        >
          <span className="panel__chevron" aria-hidden="true">
            {collapsed ? '▸' : '▾'}
          </span>
          {title}
        </button>
        {onClose && (
          <button
            type="button"
            className="panel__close"
            aria-label={`Close ${title} panel`}
            title={`Close ${title}`}
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="panel__body" id={`panel-body-${id}`}>
          {children}
        </div>
      )}
    </section>
  );
}
