# Obsipix

A web-first pixel-art editor built around exact logical-pixel editing.

The authoritative specification is [`PROJECT_CORE_OBSIPIX.md`](../PROJECT_CORE_OBSIPIX.md);
the build order is [`OBSIPIX_CODING_PHASES.md`](../OBSIPIX_CODING_PHASES.md).

## Requirements

- Node.js >= 20

## Getting started

```bash
npm install
npx playwright install --with-deps chromium   # one-time, for E2E
npm run dev
```

## Scripts

| Script                 | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server                          |
| `npm run build`        | Type-check (project refs) and produce a prod build |
| `npm run preview`      | Serve the production build locally                 |
| `npm run typecheck`    | Strict TypeScript check, no emit                   |
| `npm run lint`         | ESLint (flat config, type-aware)                   |
| `npm run format`       | Prettier write                                     |
| `npm run format:check` | Prettier check (CI)                                |
| `npm test`             | Vitest unit/integration run                        |
| `npm run test:watch`   | Vitest watch mode                                  |
| `npm run test:e2e`     | Playwright end-to-end run                          |
| `npm run check`        | typecheck + lint + format:check + test + build     |

## Architecture boundaries

These boundaries are the coding contract for every phase (PROJECT_CORE §4):

- **Document** — source of truth
- **Commands** — mutation boundary
- **History** — committed changes
- **Events** — communication
- **Services** — coordination
- **Renderer** — visual output
- **Serializer** — project persistence
- **Input** — user-interaction boundary
- **Browser APIs** — external infrastructure

Core code (`src/core`) must not depend on React or browser APIs.

## Source layout

```
src/
├── app/              application shell (React presentation)
└── core/             browser-independent engine
    ├── types/        ids, geometry, color primitives
    ├── pixels/       PixelBuffer — authoritative RGBA pixel store
    └── document/     Document, layers, frames, cels, selection, invariants
tests/
├── unit/             standalone unit specs (co-located *.test.ts also allowed)
└── e2e/              Playwright specs
```

Directories are created only when a phase needs them.

## Phase status

| Phase | Area                        | Status      |
| ----- | --------------------------- | ----------- |
| 0     | Repository / Foundation     | COMPLETE    |
| 1     | Pixel Engine                | COMPLETE    |
| 2     | Document / Layers           | COMPLETE    |
| 3     | Commands / History          | NOT STARTED |
| 4+    | see `OBSIPIX_CODING_PHASES` | NOT STARTED |
