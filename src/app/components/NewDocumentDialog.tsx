import { useState } from 'react';

import { MAX_DOCUMENT_DIMENSION } from '@core/document/defaults';
import { ASSET_CATEGORIES, type AssetCategory } from '@core/project/AssetCategory';
import type { TemplateId } from '@core/project/Template';
import type { TemplateRegistry } from '@core/project/TemplateRegistry';
import { BLACK, WHITE, type RGBA } from '@core/types/color';

import { Dialog } from './Dialog';
import './NewDocumentDialog.css';

interface NewDocumentDialogProps {
  readonly onClose: () => void;
  readonly onCreate: (options: { width: number; height: number; background: RGBA | null }) => void;
  /**
   * When provided, adds a "From Template" source alongside the blank-canvas
   * flow (V2 coding-phases Phase 2). Omit to keep today's V1 dialog exactly
   * as it was.
   */
  readonly templates?: TemplateRegistry;
  readonly onCreateFromTemplate?: (templateId: TemplateId) => void;
}

type Source = 'blank' | 'template';

const PRESETS = [16, 32, 48, 64, 128] as const;
type Background = 'transparent' | 'white' | 'black';

const BACKGROUND_RGBA: Record<Background, RGBA | null> = {
  transparent: null,
  white: WHITE,
  black: BLACK,
};

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** File → New (PROJECT_CORE §56.1): size presets, custom dimensions, background. */
export function NewDocumentDialog({
  onClose,
  onCreate,
  templates,
  onCreateFromTemplate,
}: NewDocumentDialogProps) {
  const [source, setSource] = useState<Source>('blank');
  const [width, setWidth] = useState('32');
  const [height, setHeight] = useState('32');
  const [background, setBackground] = useState<Background>('transparent');
  const [category, setCategory] = useState<AssetCategory>(ASSET_CATEGORIES[0]);
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);

  const parsed = { w: Number.parseInt(width, 10), h: Number.parseInt(height, 10) };
  const valid =
    Number.isInteger(parsed.w) &&
    Number.isInteger(parsed.h) &&
    parsed.w >= 1 &&
    parsed.h >= 1 &&
    parsed.w <= MAX_DOCUMENT_DIMENSION &&
    parsed.h <= MAX_DOCUMENT_DIMENSION;

  const activePreset =
    parsed.w === parsed.h ? PRESETS.find((size) => size === parsed.w) : undefined;

  const categoryTemplates = templates ? templates.listByCategory(category) : [];
  const selectedTemplate =
    categoryTemplates.find((template) => template.id === templateId) ?? categoryTemplates[0];

  const create = (): void => {
    if (source === 'template') {
      if (selectedTemplate) {
        onCreateFromTemplate?.(selectedTemplate.id);
      }
      return;
    }
    if (valid) {
      onCreate({ width: parsed.w, height: parsed.h, background: BACKGROUND_RGBA[background] });
    }
  };

  return (
    <Dialog
      title="New document"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="new-doc__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="new-doc__button is-primary"
            disabled={source === 'template' ? !selectedTemplate : !valid}
            onClick={create}
          >
            Create
          </button>
        </>
      }
    >
      {templates && (
        <fieldset className="new-doc__group">
          <legend>Source</legend>
          <div className="new-doc__presets">
            <button
              type="button"
              aria-pressed={source === 'blank'}
              className={source === 'blank' ? 'new-doc__preset is-active' : 'new-doc__preset'}
              onClick={() => {
                setSource('blank');
              }}
            >
              Blank
            </button>
            <button
              type="button"
              aria-pressed={source === 'template'}
              className={source === 'template' ? 'new-doc__preset is-active' : 'new-doc__preset'}
              onClick={() => {
                setSource('template');
              }}
            >
              From Template
            </button>
          </div>
        </fieldset>
      )}

      {source === 'template' && templates ? (
        <>
          <div className="new-doc__dims">
            <label className="new-doc__field">
              Category
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as AssetCategory);
                  setTemplateId(null);
                }}
              >
                {ASSET_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="new-doc__field">
              Template
              <select
                value={selectedTemplate?.id ?? ''}
                disabled={categoryTemplates.length === 0}
                onChange={(event) => {
                  setTemplateId(event.target.value);
                }}
              >
                {categoryTemplates.length === 0 ? (
                  <option value="">No templates yet</option>
                ) : (
                  categoryTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
          {selectedTemplate && (
            <p className="new-doc__template-summary">
              {selectedTemplate.canvasSize.width}×{selectedTemplate.canvasSize.height} ·{' '}
              {formatLabel(selectedTemplate.perspective)}
            </p>
          )}
        </>
      ) : (
        <>
          <fieldset className="new-doc__group">
            <legend>Preset</legend>
            <div className="new-doc__presets">
              {PRESETS.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={activePreset === size}
                  className={
                    activePreset === size ? 'new-doc__preset is-active' : 'new-doc__preset'
                  }
                  onClick={() => {
                    setWidth(String(size));
                    setHeight(String(size));
                  }}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="new-doc__dims">
            <label className="new-doc__field">
              Width
              <input
                type="number"
                min={1}
                max={MAX_DOCUMENT_DIMENSION}
                value={width}
                onChange={(event) => {
                  setWidth(event.target.value);
                }}
              />
            </label>
            <label className="new-doc__field">
              Height
              <input
                type="number"
                min={1}
                max={MAX_DOCUMENT_DIMENSION}
                value={height}
                onChange={(event) => {
                  setHeight(event.target.value);
                }}
              />
            </label>
          </div>

          <fieldset className="new-doc__group">
            <legend>Background</legend>
            <div className="new-doc__backgrounds">
              {(['transparent', 'white', 'black'] as const).map((option) => (
                <label key={option} className="new-doc__radio">
                  <input
                    type="radio"
                    name="new-doc-background"
                    checked={background === option}
                    onChange={() => {
                      setBackground(option);
                    }}
                  />
                  {option === 'transparent'
                    ? 'Transparent'
                    : option === 'white'
                      ? 'White'
                      : 'Black'}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
    </Dialog>
  );
}
