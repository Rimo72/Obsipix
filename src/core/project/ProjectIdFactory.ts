import type { AssetId, ProjectId } from '@core/types/ids';

/**
 * Source of stable, unique identities for Project-level entities (Project,
 * Asset). Mirrors {@link IdFactory} one layer up: Documents get their ids
 * from an `IdFactory`, Projects and Assets from a `ProjectIdFactory`. The
 * factory is injected so tests can use a deterministic sequence.
 */
export interface ProjectIdFactory {
  project(): ProjectId;
  asset(): AssetId;
}

function defaultRandom(): string {
  return crypto.randomUUID();
}

export function createProjectIdFactory(source: () => string = defaultRandom): ProjectIdFactory {
  return {
    project: () => `prj_${source()}` as ProjectId,
    asset: () => `ast_${source()}` as AssetId,
  };
}

/** A deterministic factory (`*_1`, `*_2`, …) for tests and fixtures. */
export function createSequentialProjectIdFactory(): ProjectIdFactory {
  let counter = 0;
  return createProjectIdFactory(() => {
    counter += 1;
    return String(counter);
  });
}
