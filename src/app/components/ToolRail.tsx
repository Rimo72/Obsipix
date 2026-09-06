import type { EditorSession } from '../EditorSession';
import { TOOL_CATALOG } from '../toolCatalog';
import './ToolRail.css';

interface ToolRailProps {
  readonly session: EditorSession;
}

export function ToolRail({ session }: ToolRailProps) {
  return (
    <nav className="tool-rail" aria-label="Tools">
      {TOOL_CATALOG.map((tool) => {
        const active = session.activeToolId === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            className={active ? 'tool-rail__button tool-rail__button--active' : 'tool-rail__button'}
            aria-pressed={active}
            title={`${tool.label} (${tool.key})`}
            onClick={() => {
              session.setTool(tool.id);
            }}
          >
            {tool.label}
          </button>
        );
      })}
    </nav>
  );
}
