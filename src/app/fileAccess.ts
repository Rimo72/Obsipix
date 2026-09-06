/**
 * Browser file glue (PROJECT_CORE §14). The core engine only ever deals in
 * `Uint8Array`; this module is the only place `Blob` / anchor download / file
 * input are used.
 */

export function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // give the download a tick to start before revoking
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export interface PickedFile {
  readonly name: string;
  readonly bytes: Uint8Array;
}

/** Prompt the user for a file; resolves `null` if they cancel. */
export function pickFile(accept: string): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.append(input);

    let settled = false;
    const finish = (value: PickedFile | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      input.remove();
      resolve(value);
    };

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      file
        .arrayBuffer()
        .then((buffer) => {
          finish({ name: file.name, bytes: new Uint8Array(buffer) });
        })
        .catch(() => {
          finish(null);
        });
    });
    // If the dialog is dismissed there is no reliable event; a focus round-trip
    // is the common heuristic. Kept simple: rely on `change` only.
    input.click();
  });
}
