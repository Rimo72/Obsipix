import type { TerrainTileRole } from '@core/project/TerrainTileRole';
import { TERRAIN_TILE_ROLES } from '@core/project/TerrainTileRole';
import type { FrameId } from '@core/types/ids';

import type { EditorSession } from '../EditorSession';
import { FrameThumbnail } from './FrameThumbnail';
import './TerrainGridPanel.css';

interface TerrainGridPanelProps {
  readonly session: EditorSession;
}

const ROLE_LABEL: Record<TerrainTileRole, string> = {
  corner_tl: 'Corner ↖',
  edge_top: 'Edge ↑',
  corner_tr: 'Corner ↗',
  edge_left: 'Edge ←',
  center: 'Center',
  edge_right: 'Edge →',
  corner_bl: 'Corner ↙',
  edge_bottom: 'Edge ↓',
  corner_br: 'Corner ↘',
};

/**
 * A 3x3 preview of a terrain tile-role set (V2 coding-phases Phase 5,
 * vision doc §6's diagram), for the active asset. Click a slot to switch to
 * editing that tile. Empty when the active asset isn't a terrain set.
 */
export function TerrainGridPanel({ session }: TerrainGridPanelProps) {
  const terrainRoles = session.assetMetadata.terrainRoles;

  if (!terrainRoles || terrainRoles.length === 0) {
    return <p className="terrain-grid__empty">This asset isn&rsquo;t a terrain set.</p>;
  }

  const frameByRole = new Map<TerrainTileRole, FrameId>();
  for (const slot of terrainRoles) {
    const frame = session.document.timeline.frames[slot.frameIndex];
    if (frame) {
      frameByRole.set(slot.role, frame.id);
    }
  }
  const activeFrameId = session.document.timeline.activeFrameId;

  return (
    <div className="terrain-grid">
      {TERRAIN_TILE_ROLES.map((role) => {
        const frameId = frameByRole.get(role);
        return (
          <button
            key={role}
            type="button"
            className={
              frameId === activeFrameId
                ? 'terrain-grid__slot terrain-grid__slot--active'
                : 'terrain-grid__slot'
            }
            aria-label={`Edit ${ROLE_LABEL[role]} tile`}
            disabled={!frameId}
            onClick={() => {
              if (frameId) {
                session.setActiveFrame(frameId);
              }
            }}
          >
            {frameId ? (
              <FrameThumbnail session={session} frameId={frameId} size={48} />
            ) : (
              <span className="terrain-grid__missing" aria-hidden="true" />
            )}
            <span className="terrain-grid__label">{ROLE_LABEL[role]}</span>
          </button>
        );
      })}
    </div>
  );
}
