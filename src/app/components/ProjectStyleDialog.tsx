import { useState } from 'react';

import { SHADOW_DIRECTIONS, type ShadowDirection } from '@core/project/Perspective';
import type { ProjectStyle } from '@core/project/ProjectStyle';
import { BLACK, type RGBA } from '@core/types/color';

import type { EditorSession } from '../EditorSession';
import { hexToRgba, rgbaToHex } from '../hexColor';
import { Dialog } from './Dialog';
import './ProjectStyleDialog.css';

interface ProjectStyleDialogProps {
  readonly session: EditorSession;
  readonly onClose: () => void;
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function PaletteField({
  label,
  colors,
  onUseActive,
  onClear,
}: {
  readonly label: string;
  readonly colors: readonly RGBA[] | undefined;
  readonly onUseActive: () => void;
  readonly onClear: () => void;
}) {
  return (
    <fieldset className="project-style__group">
      <legend>{label}</legend>
      <div className="project-style__swatches">
        {colors && colors.length > 0 ? (
          colors.map((color, index) => (
            <span
              key={`${String(index)}-${rgbaToHex(color, { alpha: 'always' })}`}
              className="project-style__swatch"
              style={{ background: rgbaToHex(color) }}
            />
          ))
        ) : (
          <span className="project-style__empty">Not set — falls back per template</span>
        )}
      </div>
      <div className="project-style__row-actions">
        <button type="button" onClick={onUseActive}>
          Use active asset&rsquo;s palette
        </button>
        {colors && colors.length > 0 && (
          <button type="button" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </fieldset>
  );
}

function ColorField({
  label,
  color,
  onChange,
  onClear,
}: {
  readonly label: string;
  readonly color: RGBA | undefined;
  readonly onChange: (color: RGBA) => void;
  readonly onClear: () => void;
}) {
  return (
    <label className="project-style__color-field">
      {label}
      <input
        type="color"
        value={rgbaToHex(color ?? BLACK)}
        onChange={(event) => {
          const parsed = hexToRgba(event.target.value);
          if (parsed) {
            onChange(parsed);
          }
        }}
      />
      {color && (
        <button type="button" onClick={onClear}>
          Clear
        </button>
      )}
    </label>
  );
}

/**
 * A Project's shared visual style (V2 coding-phases Phase 4, vision doc
 * §12): a primary/secondary palette and outline/highlight/shadow reference
 * colours + a lighting direction, applied as defaults the next time a
 * Template-driven asset is created in this Project.
 */
export function ProjectStyleDialog({ session, onClose }: ProjectStyleDialogProps) {
  const [draft, setDraft] = useState<ProjectStyle>(session.projectStyle ?? {});

  const activePaletteColors = (): readonly RGBA[] =>
    session.document.activePalette?.colors.map((entry) => entry.rgba) ?? [];

  const save = (): void => {
    session.setProjectStyle(draft);
    onClose();
  };

  return (
    <Dialog
      title="Project Style"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <p className="project-style__intro">
        Shared defaults for every asset created from a template in this project. A template&rsquo;s
        own choices always win over these.
      </p>

      <PaletteField
        label="Primary palette"
        colors={draft.primaryPalette}
        onUseActive={() => {
          setDraft((current) => ({ ...current, primaryPalette: activePaletteColors() }));
        }}
        onClear={() => {
          setDraft(({ primaryPalette: _drop, ...rest }) => rest);
        }}
      />

      <PaletteField
        label="Secondary palette"
        colors={draft.secondaryPalette}
        onUseActive={() => {
          setDraft((current) => ({ ...current, secondaryPalette: activePaletteColors() }));
        }}
        onClear={() => {
          setDraft(({ secondaryPalette: _drop, ...rest }) => rest);
        }}
      />

      <fieldset className="project-style__group">
        <legend>Reference colours</legend>
        <div className="project-style__colors">
          <ColorField
            label="Outline"
            color={draft.outlineColor}
            onChange={(color) => {
              setDraft((current) => ({ ...current, outlineColor: color }));
            }}
            onClear={() => {
              setDraft(({ outlineColor: _drop, ...rest }) => rest);
            }}
          />
          <ColorField
            label="Highlight"
            color={draft.highlightColor}
            onChange={(color) => {
              setDraft((current) => ({ ...current, highlightColor: color }));
            }}
            onClear={() => {
              setDraft(({ highlightColor: _drop, ...rest }) => rest);
            }}
          />
          <ColorField
            label="Shadow"
            color={draft.shadowColor}
            onChange={(color) => {
              setDraft((current) => ({ ...current, shadowColor: color }));
            }}
            onClear={() => {
              setDraft(({ shadowColor: _drop, ...rest }) => rest);
            }}
          />
        </div>
      </fieldset>

      <fieldset className="project-style__group">
        <legend>Lighting direction</legend>
        <select
          value={draft.lightingDirection ?? ''}
          onChange={(event) => {
            const value = event.target.value as ShadowDirection | '';
            if (value === '') {
              setDraft(({ lightingDirection: _drop, ...rest }) => rest);
            } else {
              setDraft((current) => ({ ...current, lightingDirection: value }));
            }
          }}
        >
          <option value="">Unset — use each perspective&rsquo;s own default</option>
          {SHADOW_DIRECTIONS.map((direction) => (
            <option key={direction} value={direction}>
              {formatLabel(direction)}
            </option>
          ))}
        </select>
      </fieldset>
    </Dialog>
  );
}
