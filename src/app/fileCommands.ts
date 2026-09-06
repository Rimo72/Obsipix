import { ObsipixParseError } from '@core/persistence/format';

import type { EditorSession } from './EditorSession';
import { downloadBytes, pickFile } from './fileAccess';

function baseName(session: EditorSession): string {
  const name = session.fileName ?? `${session.document.metadata.name || 'Untitled'}.obsipix`;
  return name.replace(/\.obsipix$/i, '');
}

/** Save the project as an `.obsipix` download and mark it saved. */
export function saveProject(session: EditorSession): void {
  const fileName = `${baseName(session)}.obsipix`;
  downloadBytes(session.serialize(), fileName, 'application/x-obsipix');
  session.markSaved(fileName);
}

/** Prompt for an `.obsipix` file and load it. Returns an error message on failure. */
export async function openProject(session: EditorSession): Promise<string | null> {
  const picked = await pickFile('.obsipix');
  if (!picked) {
    return null;
  }
  try {
    session.open(picked.bytes, picked.name);
    return null;
  } catch (error) {
    if (error instanceof ObsipixParseError) {
      return error.message;
    }
    return 'The file could not be opened.';
  }
}

/** Export the current frame as a PNG download. */
export function exportProjectPng(session: EditorSession): void {
  downloadBytes(session.exportPngBytes(), `${baseName(session)}.png`, 'image/png');
}

/** Start a new default project (caller confirms unsaved changes first). */
export function newProject(session: EditorSession): void {
  session.newDocument();
}
