import { EditorError } from '@core/errors/EditorError';
import { ObsipixParseError } from '@core/persistence/format';

import type { EditorSession } from './EditorSession';
import { downloadBytes, pickFile } from './fileAccess';
import { decodePng } from './pngDecode';

function baseName(session: EditorSession): string {
  const name = session.fileName ?? `${session.document.metadata.name || 'Untitled'}.obsipix`;
  return name.replace(/\.obsipix$/i, '');
}

function sanitizeName(input: string): string {
  return (
    input
      .trim()
      .replace(/\.obsipix$/i, '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .slice(0, 120) || 'Untitled'
  );
}

/** Write the project as an `.obsipix` download under `fileName` and mark it saved. */
function writeProject(session: EditorSession, fileName: string): void {
  downloadBytes(session.serialize(), fileName, 'application/x-obsipix');
  session.markSaved(fileName);
}

/**
 * Save to the current file name, or to a name derived from the project
 * (PROJECT_CORE §3.10). Returns an error message if the save could not start.
 */
export function saveProject(session: EditorSession): string | null {
  try {
    writeProject(session, session.fileName ?? `${baseName(session)}.obsipix`);
    return null;
  } catch (error) {
    return error instanceof EditorError ? error.message : 'The project could not be saved.';
  }
}

/** Save under a new name chosen by the user. Returns an error message, or null. */
export function saveProjectAs(session: EditorSession): string | null {
  const suggested = baseName(session);
  const chosen =
    typeof window === 'undefined' ? suggested : window.prompt('Save project as', suggested);
  if (chosen === null) {
    return null; // user cancelled — not an error, project stays dirty
  }
  try {
    writeProject(session, `${sanitizeName(chosen)}.obsipix`);
    return null;
  } catch (error) {
    return error instanceof EditorError ? error.message : 'The project could not be saved.';
  }
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

/** Close the current project — same result as New; caller confirms unsaved changes. */
export function closeProject(session: EditorSession): void {
  session.newDocument();
}

type ImportMode = 'document' | 'layer';

/** Prompt for a PNG and import it as a new document or as a layer. Returns an error message on failure. */
export async function importPng(session: EditorSession, mode: ImportMode): Promise<string | null> {
  const picked = await pickFile('image/png,.png');
  if (!picked) {
    return null;
  }
  try {
    const image = await decodePng(picked.bytes);
    const name = picked.name.replace(/\.png$/i, '') || 'Imported';
    if (mode === 'document') {
      session.importAsDocument(image, name);
    } else {
      session.importAsLayer(image, name);
    }
    return null;
  } catch (error) {
    return error instanceof EditorError ? error.message : 'The PNG could not be imported.';
  }
}
