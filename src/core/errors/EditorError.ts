export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface EditorErrorOptions {
  readonly severity?: ErrorSeverity;
  readonly cause?: unknown;
}

/**
 * A structured error carrying a stable `code` and a `severity`
 * (PROJECT_CORE §7.10, §15). Thrown by core systems where callers may need to
 * branch on the failure; ordinary programmer errors still use plain `Error` /
 * `RangeError`.
 */
export class EditorError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;

  constructor(code: string, message: string, options: EditorErrorOptions = {}) {
    super(message);
    this.name = 'EditorError';
    this.code = code;
    this.severity = options.severity ?? 'error';
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
