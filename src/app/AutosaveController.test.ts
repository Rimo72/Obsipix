import { afterEach, describe, expect, it, vi } from 'vitest';

import { MemoryRecoveryStore } from '@infrastructure/recovery/RecoveryStore';
import { OBSIPIX_MAGIC } from '@core/persistence/format';
import { NO_MODIFIERS, type PointerInput } from '@core/tools/PointerInput';

import { AutosaveController } from './AutosaveController';
import { EditorSession } from './EditorSession';

function press(x: number, y: number, button: 'left' | 'none' = 'left'): PointerInput {
  return {
    canvas: { x, y },
    pixel: { x, y },
    source: 'mouse',
    buttons: { left: button === 'left', right: false, middle: false },
    modifiers: NO_MODIFIERS,
    pressure: 1,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('AutosaveController', () => {
  it('writes a recovery snapshot only while the document is dirty', async () => {
    const session = new EditorSession();
    const store = new MemoryRecoveryStore();
    const autosave = new AutosaveController(session, store, { now: () => 4242 });

    await autosave.tick();
    expect(await store.load()).toBeNull(); // clean → nothing written

    session.pointerDown(press(2, 2));
    session.pointerUp(press(2, 2, 'none'));
    expect(session.isDirty).toBe(true);

    await autosave.tick();
    const snapshot = await store.load();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.savedAt).toBe(4242);
    expect(Array.from(snapshot?.bytes.subarray(0, OBSIPIX_MAGIC.length) ?? [])).toEqual([
      ...OBSIPIX_MAGIC,
    ]);
  });

  it('skips a tick while a stroke or float is mid-interaction', async () => {
    const session = new EditorSession();
    const store = new MemoryRecoveryStore();
    const autosave = new AutosaveController(session, store);

    session.pointerDown(press(1, 1)); // stroke open
    expect(session.isInteracting).toBe(true);
    await autosave.tick();
    expect(await store.load()).toBeNull();

    session.pointerUp(press(1, 1, 'none'));
  });

  it('runs on an interval and stops cleanly', async () => {
    vi.useFakeTimers();
    const session = new EditorSession();
    const store = new MemoryRecoveryStore();
    const save = vi.spyOn(store, 'save');
    const autosave = new AutosaveController(session, store, { intervalMs: 1000 });

    session.pointerDown(press(3, 3));
    session.pointerUp(press(3, 3, 'none'));

    autosave.start();
    await vi.advanceTimersByTimeAsync(3500);
    expect(save.mock.calls.length).toBeGreaterThanOrEqual(3);

    autosave.stop();
    save.mockClear();
    await vi.advanceTimersByTimeAsync(3000);
    expect(save).not.toHaveBeenCalled();
  });

  it('resolve() clears the recovery snapshot', async () => {
    const session = new EditorSession();
    const store = new MemoryRecoveryStore();
    await store.save({ bytes: new Uint8Array([1, 2]), fileName: null, savedAt: 0 });

    await new AutosaveController(session, store).resolve();
    expect(await store.load()).toBeNull();
  });
});
