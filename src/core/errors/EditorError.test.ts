import { describe, expect, it } from 'vitest';

import { EditorError } from './EditorError';

describe('EditorError', () => {
  it('carries a code and defaults to error severity', () => {
    const error = new EditorError('persistence/save-failed', 'Could not write the file');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('EditorError');
    expect(error.code).toBe('persistence/save-failed');
    expect(error.severity).toBe('error');
    expect(error.message).toBe('Could not write the file');
  });

  it('accepts an explicit severity and a cause', () => {
    const cause = new RangeError('bad input');
    const error = new EditorError('validation/bad-dimensions', 'Invalid size', {
      severity: 'critical',
      cause,
    });
    expect(error.severity).toBe('critical');
    expect(error.cause).toBe(cause);
  });
});
