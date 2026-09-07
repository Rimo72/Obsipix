# Obsipix

A web-first pixel-art editor built around exact logical-pixel editing.

The authoritative specification is [`docs/PROJECT_CORE_OBSIPIX.md`](docs/PROJECT_CORE_OBSIPIX.md);
the build order and phase status is [`docs/OBSIPIX_CODING_PHASES.md`](docs/OBSIPIX_CODING_PHASES.md).

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
    ├── document/     Document, layers, frames, cels, selection, invariants
    ├── history/      Command interface + snapshot undo/redo, transactions, strokes
    ├── tools/        Pencil/Eraser/Eyedropper/Fill/Line/Rect/Ellipse/Select/Move, brush, shapes, transform
    ├── persistence/  .obsipix serializer/parser (CRC + RLE), PNG encoder
    └── errors/       EditorError (structured, severity-tagged)
src/rendering/        browser-facing: Viewport (coordinate transforms),
                      CanvasRenderer (layered passes)
src/app/              React shell, EditorSession, pointer + file glue
tests/
├── unit/             standalone unit specs (co-located *.test.ts also allowed)
└── e2e/              Playwright specs
```

Directories are created only when a phase needs them.

## Phase status

| Phase | Area                         | Status      |
| ----- | ---------------------------- | ----------- |
| 0     | Repository / Foundation      | COMPLETE    |
| 1     | Pixel Engine                 | COMPLETE    |
| 2     | Document / Layers            | COMPLETE    |
| 3     | Commands / History           | COMPLETE    |
| 4     | Renderer / Coordinates       | COMPLETE    |
| 5     | Input / Vertical Slice       | COMPLETE    |
| 6     | Persistence / PNG            | COMPLETE    |
| 7     | Core Editor Features         | COMPLETE    |
| 8     | Selection / Transform        | COMPLETE    |
| 9     | Palettes                     | COMPLETE    |
| 10    | Animation                    | COMPLETE    |
| 11    | Lifecycle / Recovery / Input | COMPLETE    |
| 12    | UI Completion                | COMPLETE    |
| 13    | Hardening                    | COMPLETE    |
| 14+   | see `OBSIPIX_CODING_PHASES`  | NOT STARTED |
