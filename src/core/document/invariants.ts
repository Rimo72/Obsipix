import { areDimensionsEqual } from '@core/types/geometry';

import type { Document } from './Document';

export class DocumentInvariantError extends Error {
  constructor(problems: readonly string[]) {
    super(`Document invariants violated:\n- ${problems.join('\n- ')}`);
    this.name = 'DocumentInvariantError';
  }
}

/**
 * Check the runtime invariants of PROJECT_CORE §8.9 and return a list of
 * human-readable problems (empty when the document is valid). Malformed
 * project data must never produce a document that passes this.
 */
export function validateDocument(document: Document): string[] {
  const problems: string[] = [];
  const { width, height } = document.dimensions;

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    problems.push(`dimensions must be positive integers (got ${width}x${height})`);
  }

  if (document.layers.count < 1) {
    problems.push('a document must have at least one layer');
  }

  if (document.timeline.frameCount < 1) {
    problems.push('a document must have at least one frame');
  }

  for (const layer of document.layers.layers) {
    if (!Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) {
      problems.push(`layer "${layer.id}" opacity ${layer.opacity} is outside [0, 1]`);
    }
  }

  if (!document.selection.matchesDimensions(document.dimensions)) {
    problems.push('selection mask dimensions do not match the document');
  }

  const seenIds = new Set<string>();
  const flagDuplicate = (kind: string, id: string): void => {
    if (seenIds.has(id)) {
      problems.push(`duplicate ${kind} id "${id}"`);
    }
    seenIds.add(id);
  };

  for (const layer of document.layers.layers) {
    flagDuplicate('layer', layer.id);
  }

  const layerIds = new Set(document.layers.layerIds());
  for (const frame of document.timeline.frames) {
    flagDuplicate('frame', frame.id);

    for (const layerId of layerIds) {
      if (!frame.hasCel(layerId)) {
        problems.push(`frame "${frame.id}" is missing a cel for layer "${layerId}"`);
      }
    }

    for (const cel of frame.cels()) {
      flagDuplicate('cel', cel.id);
      const buffer = cel.buffer;
      if (buffer && !areDimensionsEqual(buffer.dimensions, document.dimensions)) {
        problems.push(
          `cel "${cel.id}" buffer ${buffer.width}x${buffer.height} does not match the document`,
        );
      }
    }
  }

  return problems;
}

export function assertDocumentInvariants(document: Document): void {
  const problems = validateDocument(document);
  if (problems.length > 0) {
    throw new DocumentInvariantError(problems);
  }
}
