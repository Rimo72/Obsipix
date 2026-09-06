import { command, mutation, type Command } from '@core/history/Command';
import { TRANSPARENT, type RGBA } from '@core/types/color';
import type { AnimationTagId, FrameId, LayerId } from '@core/types/ids';

import type { TagDirection } from './AnimationTag';
import type { Document } from './Document';

const touch = (document: Document): { affectedFrameIds: FrameId[] } => ({
  affectedFrameIds: [document.timeline.activeFrameId],
});

// --- Frames -----------------------------------------------------------

export function addFrameCommand(): Command {
  return command('Add frame', (document) => {
    const id = document.addFrame();
    document.setActiveFrame(id);
    return { affectedFrameIds: [id] };
  });
}

export function addEmptyFrameCommand(): Command {
  return command('Add empty frame', (document) => {
    const id = document.addEmptyFrame();
    document.setActiveFrame(id);
    return { affectedFrameIds: [id] };
  });
}

export function duplicateFrameCommand(frameId: FrameId): Command {
  return command('Duplicate frame', (document) => {
    const id = document.duplicateFrame(frameId);
    document.setActiveFrame(id);
    return { affectedFrameIds: [id] };
  });
}

export function deleteFrameCommand(frameId: FrameId): Command {
  return mutation('Delete frame', (document) => {
    document.removeFrame(frameId);
  });
}

export function moveFrameCommand(frameId: FrameId, toIndex: number): Command {
  return mutation('Reorder frame', (document) => {
    document.moveFrame(frameId, toIndex);
  });
}

export function setFrameDurationCommand(frameId: FrameId, durationMs: number): Command {
  return mutation('Frame duration', (document) => {
    document.setFrameDuration(frameId, durationMs);
  });
}

export function applyFpsCommand(fps: number): Command {
  return mutation('Set FPS', (document) => {
    document.timeline.applyUniformFps(fps);
  });
}

// --- Cels ------------------------------------------------------------

export function linkCelCommand(
  sourceFrameId: FrameId,
  targetFrameId: FrameId,
  layerId: LayerId,
): Command {
  return command('Link cel', (document) => {
    document.linkCel(sourceFrameId, targetFrameId, layerId);
    return { affectedFrameIds: [targetFrameId], affectedLayerIds: [layerId] };
  });
}

export function holdCelCommand(frameId: FrameId, layerId: LayerId): Command {
  return command('Hold cel', (document) => {
    document.holdCel(frameId, layerId);
    return { affectedFrameIds: [frameId], affectedLayerIds: [layerId] };
  });
}

export function makeCelUniqueCommand(frameId: FrameId, layerId: LayerId): Command {
  return command('Make unique', (document) => {
    document.makeCelUnique(frameId, layerId);
    return { affectedFrameIds: [frameId], affectedLayerIds: [layerId] };
  });
}

export function clearCelCommand(frameId: FrameId, layerId: LayerId): Command {
  return command('Clear cel', (document) => {
    const buffer = document.ensureDrawableBuffer(layerId, frameId);
    const { width, height } = document.dimensions;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        buffer.setPixel(x, y, TRANSPARENT);
      }
    }
    return { affectedFrameIds: [frameId], affectedLayerIds: [layerId] };
  });
}

// --- Tags ------------------------------------------------------------

export function addTagCommand(name: string, startFrame: number, endFrame: number): Command {
  return command('Add tag', (document) => {
    document.timeline.addTag({
      name,
      startFrame,
      endFrame,
      direction: 'forward',
    });
    return touch(document);
  });
}

export interface TagPatch {
  readonly name?: string;
  readonly startFrame?: number;
  readonly endFrame?: number;
  readonly direction?: TagDirection;
  readonly color?: RGBA;
  readonly fps?: number;
}

export function updateTagCommand(tagId: AnimationTagId, patch: TagPatch): Command {
  return mutation('Edit tag', (document) => {
    document.timeline.updateTag(tagId, patch);
  });
}

export function deleteTagCommand(tagId: AnimationTagId): Command {
  return mutation('Delete tag', (document) => {
    document.timeline.removeTag(tagId);
  });
}
