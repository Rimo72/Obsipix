import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Guards `vercel.json`'s security headers — most importantly that the
 * Content-Security-Policy's `script-src` still carries the exact `sha256-` hash
 * of the Google Analytics inline bootstrap that `vite.config.ts` injects. A
 * stale hash silently breaks analytics on the deployed site (the browser
 * refuses to run the inline script), so this test recomputes it from source.
 */

function must<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

function readRepoFile(relativePath: string): string {
  // vitest runs with the repo root as the working directory.
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

interface HeaderRule {
  readonly source: string;
  readonly headers: readonly { readonly key: string; readonly value: string }[];
}

interface VercelConfig {
  readonly headers?: readonly HeaderRule[];
}

/** Re-derive the GA inline `<script>` body exactly as `googleAnalytics()` builds it. */
function gaInlineScriptFromViteConfig(): string {
  const config = readRepoFile('vite.config.ts');
  const measurementId = must(
    /GA_MEASUREMENT_ID = '([^']+)'/.exec(config)?.[1],
    'could not find GA_MEASUREMENT_ID in vite.config.ts',
  );
  const block = must(
    /children: \[([\s\S]*?)\]\.join\('\\n'\)/.exec(config)?.[1],
    'could not find the GA inline-script array in vite.config.ts',
  );
  return block
    .trim()
    .split('\n')
    .map((line) => {
      const literal = line.trim().replace(/,$/, '');
      // strip the surrounding ' " or ` quote character
      return literal.slice(1, -1).replaceAll('${measurementId}', measurementId);
    })
    .join('\n');
}

function parseVercelConfig(): VercelConfig {
  return JSON.parse(readRepoFile('vercel.json')) as VercelConfig;
}

function headerRuleFor(source: string): HeaderRule {
  const config = parseVercelConfig();
  return must(
    config.headers?.find((rule) => rule.source === source),
    `vercel.json has no header rule for "${source}"`,
  );
}

function headerValue(rule: HeaderRule, key: string): string {
  return must(
    rule.headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value,
    `vercel.json rule "${rule.source}" is missing the ${key} header`,
  );
}

function cspDirectives(csp: string): Map<string, string> {
  const directives = new Map<string, string>();
  for (const part of csp.split(';')) {
    const trimmed = part.trim();
    if (trimmed === '') {
      continue;
    }
    const spaceAt = trimmed.indexOf(' ');
    if (spaceAt === -1) {
      directives.set(trimmed, '');
    } else {
      directives.set(trimmed.slice(0, spaceAt), trimmed.slice(spaceAt + 1));
    }
  }
  return directives;
}

describe('vercel.json security headers', () => {
  const siteRule = headerRuleFor('/(.*)');
  const csp = cspDirectives(headerValue(siteRule, 'Content-Security-Policy'));

  it('allow-lists the current Google Analytics inline script by hash', () => {
    const hash = createHash('sha256')
      .update(gaInlineScriptFromViteConfig(), 'utf8')
      .digest('base64');
    const scriptSrc = must(csp.get('script-src'), 'CSP has no script-src directive');
    expect(scriptSrc).toContain(`'sha256-${hash}'`);
  });

  it('keeps script-src locked down', () => {
    const scriptSrc = must(csp.get('script-src'), 'CSP has no script-src directive');
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain('https://www.googletagmanager.com');
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
  });

  it('sets restrictive fetch and framing defaults', () => {
    expect(csp.get('default-src')).toBe("'self'");
    expect(csp.get('object-src')).toBe("'none'");
    expect(csp.get('base-uri')).toBe("'none'");
    expect(csp.get('frame-ancestors')).toBe("'none'");
    expect(csp.get('form-action')).toBe("'none'");
    expect(csp.has('upgrade-insecure-requests')).toBe(true);
  });

  it('reaches Google Analytics endpoints for beacons only', () => {
    const connectSrc = must(csp.get('connect-src'), 'CSP has no connect-src directive');
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('https://www.google-analytics.com');
  });

  it('ships the standard hardening headers', () => {
    expect(headerValue(siteRule, 'X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue(siteRule, 'X-Frame-Options')).toBe('DENY');
    expect(headerValue(siteRule, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headerValue(siteRule, 'Strict-Transport-Security')).toContain('max-age=');
    expect(headerValue(siteRule, 'Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headerValue(siteRule, 'Cross-Origin-Resource-Policy')).toBe('same-origin');

    const permissions = headerValue(siteRule, 'Permissions-Policy');
    expect(permissions).toContain('camera=()');
    expect(permissions).toContain('microphone=()');
    expect(permissions).toContain('geolocation=()');
  });

  it('still serves immutable caching for fingerprinted assets', () => {
    expect(headerValue(headerRuleFor('/assets/(.*)'), 'Cache-Control')).toContain('immutable');
  });
});
