import { command, mutation, type Command } from '@core/history/Command';
import { PixelBuffer } from '@core/pixels/PixelBuffer';
import type { LayerId } from '@core/types/ids';

import { blendOver } from './compositeDocument';
import type { Document } from './Document';

const touch = (...layerIds: LayerId[]): { affectedLayerIds: LayerId[] } => ({
  affectedLayerIds: layerIds,
});

export function addLayerCommand(name?: string): Command {
  return command('Add layer', (document) => touch(document.addLayer(name)));
}

export function removeLayerCommand(layerId: LayerId): Command {
  return mutation('Delete layer', (document) => {
    document.removeLayer(layerId);
  });
}

export function duplicateLayerCommand(layerId: LayerId): Command {
  return command('Duplicate layer', (document) => touch(document.duplicateLayer(layerId)));
}

export function renameLayerCommand(layerId: LayerId, name: string): Command {
  return mutation('Rename layer', (document) => {
    document.layers.require(layerId).rename(name);
  });
}

export function moveLayerCommand(layerId: LayerId, toIndex: number): Command {
  return mutation('Reorder layer', (document) => {
    document.moveLayer(layerId, toIndex);
  });
}

export function setLayerVisibilityCommand(layerId: LayerId, visible: boolean): Command {
  return mutation(visible ? 'Show layer' : 'Hide layer', (document) => {
    document.layers.require(layerId).setVisible(visible);
  });
}

export function setLayerLockedCommand(layerId: LayerId, locked: boolean): Command {
  return mutation(locked ? 'Lock layer' : 'Unlock layer', (document) => {
    document.layers.require(layerId).setLocked(locked);
  });
}

export function setLayerOpacityCommand(layerId: LayerId, opacity: number): Command {
  return mutation('Layer opacity', (document) => {
    document.layers.require(layerId).setOpacity(opacity);
  });
}

/** Clear a layer's artwork on the active frame. */
export function clearLayerCommand(layerId: LayerId): Command {
  return command('Clear layer', (document) => {
    document.ensureDrawableBuffer(layerId).clear();
    return touch(layerId);
  });
}

function flattenInto(
  document: Document,
  targetLayerId: LayerId,
  sourceLayerIds: readonly LayerId[],
): void {
  for (const frame of document.timeline.frames) {
    const target = document.ensureDrawableBuffer(targetLayerId, frame.id);
    for (const sourceId of sourceLayerIds) {
      const layer = document.layers.require(sourceId);
      const source = document.resolveBuffer(sourceId, frame.id);
      if (source && layer.visible && layer.opacity > 0) {
        blendOver(target, source, layer.opacity);
      }
    }
  }
}

/** Merge a layer down onto the one below it, then remove it. */
export function mergeDownCommand(layerId: LayerId): Command {
  return command('Merge down', (document) => {
    const index = document.layers.indexOf(layerId);
    const below = document.layers.layers[index - 1];
    if (!below) {
      throw new Error('There is no layer below to merge into');
    }
    const belowId = below.id;
    // the lower layer is the target and stays fully opaque; blend the upper layer in
    flattenInto(document, belowId, [layerId]);
    document.removeLayer(layerId);
    document.setActiveLayer(belowId);
    return touch(belowId);
  });
}

/** Flatten every visible layer into the bottom-most visible one. */
export function mergeVisibleCommand(): Command {
  return command('Merge visible', (document) => {
    const visible = document.layers.layers.filter((layer) => layer.visible);
    const base = visible[0];
    if (!base || visible.length < 2) {
      return touch();
    }
    flattenInto(
      document,
      base.id,
      visible.slice(1).map((layer) => layer.id),
    );
    for (const layer of visible.slice(1)) {
      document.removeLayer(layer.id);
    }
    document.setActiveLayer(base.id);
    return touch(base.id);
  });
}

/** Flatten the whole document to a single layer. */
export function flattenCommand(): Command {
  return command('Flatten', (document) => {
    const layers = document.layers.layers;
    const base = layers[0];
    if (!base || layers.length < 2) {
      return touch();
    }
    // start the base layer from a blank buffer, then composite every layer in order
    for (const frame of document.timeline.frames) {
      const target = document.ensureDrawableBuffer(base.id, frame.id);
      const rebuilt = PixelBuffer.create(document.dimensions.width, document.dimensions.height);
      for (const layer of layers) {
        const source = layer.id === base.id ? target : document.resolveBuffer(layer.id, frame.id);
        if (source && layer.visible && layer.opacity > 0) {
          blendOver(rebuilt, source, layer.opacity);
        }
      }
      target.copyRegion(
        rebuilt,
        { x: 0, y: 0, width: document.dimensions.width, height: document.dimensions.height },
        { x: 0, y: 0 },
      );
    }
    for (const layer of layers.slice(1)) {
      document.removeLayer(layer.id);
    }
    document.layers.require(base.id).setOpacity(1);
    document.layers.require(base.id).setVisible(true);
    document.setActiveLayer(base.id);
    return touch(base.id);
  });
}
