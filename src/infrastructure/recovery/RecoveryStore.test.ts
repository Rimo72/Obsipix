import { describe, expect, it } from 'vitest';

import { createRecoveryStore, MemoryRecoveryStore } from './RecoveryStore';

describe('MemoryRecoveryStore', () => {
  it('round-trips a snapshot and defensively copies the bytes', async () => {
    const store = new MemoryRecoveryStore();
    const bytes = new Uint8Array([1, 2, 3, 4]);
    await store.save({ bytes, fileName: 'art.obsipix', savedAt: 1000 });

    bytes[0] = 99; // mutating the caller's array must not affect the store

    const loaded = await store.load();
    expect(loaded).not.toBeNull();
    expect([...(loaded?.bytes ?? [])]).toEqual([1, 2, 3, 4]);
    expect(loaded?.fileName).toBe('art.obsipix');
    expect(loaded?.savedAt).toBe(1000);
  });

  it('load is null before any save and after clear', async () => {
    const store = new MemoryRecoveryStore();
    expect(await store.load()).toBeNull();
    await store.save({ bytes: new Uint8Array([1]), fileName: null, savedAt: 0 });
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});

describe('createRecoveryStore', () => {
  it('falls back to an in-memory store when IndexedDB is unavailable', () => {
    // jsdom provides no indexedDB
    expect(createRecoveryStore()).toBeInstanceOf(MemoryRecoveryStore);
  });
});
