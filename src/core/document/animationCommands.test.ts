import { describe, expect, it } from 'vitest';

import { History } from '@core/history/History';
import { BLACK, TRANSPARENT, rgbaEquals } from '@core/types/color';

import {
  addEmptyFrameCommand,
  addFrameCommand,
  addTagCommand,
  applyFpsCommand,
  clearCelCommand,
  deleteFrameCommand,
  deleteTagCommand,
  duplicateFrameCommand,
  holdCelCommand,
  linkCelCommand,
  makeCelUniqueCommand,
  moveFrameCommand,
  setFrameDurationCommand,
  updateTagCommand,
} from './animationCommands';
import { createDefaultDocument } from './DocumentFactory';
import { createSequentialIdFactory } from './IdFactory';

function newHistory(): History {
  return new History(createDefaultDocument(createSequentialIdFactory()));
}

describe('animation frame commands', () => {
  it('add / duplicate / reorder / delete frames, all undoable', () => {
    const history = newHistory();
    expect(history.document.timeline.frameCount).toBe(1);

    history.execute(addFrameCommand());
    expect(history.document.timeline.frameCount).toBe(2);
    // a new frame becomes active
    expect(history.document.timeline.indexOf(history.document.timeline.activeFrameId)).toBe(1);

    const [, second] = history.document.timeline.frames;
    history.execute(duplicateFrameCommand(second!.id));
    expect(history.document.timeline.frameCount).toBe(3);

    const first = history.document.timeline.frameAt(0).id;
    history.execute(moveFrameCommand(first, 2));
    expect(history.document.timeline.indexOf(first)).toBe(2);

    history.execute(deleteFrameCommand(history.document.timeline.frameAt(0).id));
    expect(history.document.timeline.frameCount).toBe(2);

    history.undo();
    expect(history.document.timeline.frameCount).toBe(3);
    history.undo();
    expect(history.document.timeline.indexOf(first)).toBe(0);
    history.undo();
    expect(history.document.timeline.frameCount).toBe(2);
    history.undo();
    expect(history.document.timeline.frameCount).toBe(1);
  });

  it('per-frame duration and uniform FPS are undoable', () => {
    const history = newHistory();
    history.execute(addFrameCommand());
    const frameId = history.document.timeline.frameAt(1).id;

    history.execute(setFrameDurationCommand(frameId, 250));
    expect(history.document.timeline.frameAt(1).durationMs).toBe(250);

    history.execute(applyFpsCommand(20));
    expect(history.document.timeline.playbackFps).toBe(20);
    expect(history.document.timeline.frames.map((frame) => frame.durationMs)).toEqual([50, 50]);

    history.undo();
    expect(history.document.timeline.frameAt(1).durationMs).toBe(250);
    history.undo();
    expect(history.document.timeline.frameAt(1).durationMs).toBe(100);
  });
});

describe('animation cel commands', () => {
  it('empty frame cel starts empty and clears back to transparent', () => {
    const history = newHistory();
    const layerId = history.document.layers.activeLayerId;
    history.execute(addEmptyFrameCommand());
    const frameId = history.document.timeline.activeFrameId;
    expect(history.document.timeline.frameAt(1).requireCel(layerId).isEmpty).toBe(true);

    history.execute(clearCelCommand(frameId, layerId));
    expect(
      rgbaEquals(
        history.document.resolveBuffer(layerId, frameId)?.getPixel(0, 0) ?? BLACK,
        TRANSPARENT,
      ),
    ).toBe(true);
  });

  it('link then make-unique detaches the shared buffer, undoably', () => {
    const history = newHistory();
    const layerId = history.document.layers.activeLayerId;
    const source = history.document.timeline.activeFrameId;
    history.document.resolveBuffer(layerId, source)?.setPixel(2, 2, BLACK);

    history.execute(addEmptyFrameCommand());
    const target = history.document.timeline.activeFrameId;

    history.execute(linkCelCommand(source, target, layerId));
    expect(history.document.timeline.requireFrame(target).requireCel(layerId).isLinked).toBe(true);
    expect(
      rgbaEquals(
        history.document.resolveBuffer(layerId, target)?.getPixel(2, 2) ?? TRANSPARENT,
        BLACK,
      ),
    ).toBe(true);

    history.execute(makeCelUniqueCommand(target, layerId));
    expect(history.document.timeline.requireFrame(target).requireCel(layerId).type).toBe('normal');

    history.execute(holdCelCommand(target, layerId));
    expect(history.document.timeline.requireFrame(target).requireCel(layerId).isHold).toBe(true);

    history.undo();
    expect(history.document.timeline.requireFrame(target).requireCel(layerId).type).toBe('normal');
    history.undo();
    expect(history.document.timeline.requireFrame(target).requireCel(layerId).isLinked).toBe(true);
  });
});

describe('animation tag commands', () => {
  it('add / edit / delete a tag, all undoable', () => {
    const history = newHistory();
    history.execute(addFrameCommand());
    history.execute(addFrameCommand());

    history.execute(addTagCommand('walk', 0, 2));
    const tag = history.document.timeline.tags[0];
    expect(tag?.name).toBe('walk');
    expect(tag?.direction).toBe('forward');

    history.execute(
      updateTagCommand(tag!.id, { name: 'run', direction: 'ping-pong', endFrame: 1 }),
    );
    expect(history.document.timeline.tags[0]?.name).toBe('run');
    expect(history.document.timeline.tags[0]?.direction).toBe('ping-pong');
    expect(history.document.timeline.tags[0]?.endFrame).toBe(1);

    history.execute(deleteTagCommand(tag!.id));
    expect(history.document.timeline.tags).toHaveLength(0);

    history.undo();
    expect(history.document.timeline.tags).toHaveLength(1);
    history.undo();
    expect(history.document.timeline.tags[0]?.name).toBe('walk');
    history.undo();
    expect(history.document.timeline.tags).toHaveLength(0);
  });
});
