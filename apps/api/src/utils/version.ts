import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function readPackageJson(): { name?: string; version?: string } {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(here, '../../package.json'), resolve(here, '../../../package.json')];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw) as { name?: string; version?: string };
      if (parsed.name === '@orvexa/api') return parsed;
    } catch {
      // try next candidate
    }
  }
  return {};
}

const pkg = readPackageJson();

export const versionInfo = {
  name: pkg.name ?? '@orvexa/api',
  version: pkg.version ?? '0.0.0',
  node: process.version,
} as const;
