// Lazy-loading, in-memory cached HTML template loader for Netlify Functions
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// With esbuild bundling, import.meta.url may be undefined — evaluate it lazily
// so the array construction doesn't throw before we can try process.cwd().
function getTemplatesDir() {
  // process.cwd() on Netlify Lambda = /var/task (repo root) — always try first.
  const candidates = [
    join(process.cwd(), 'Templates'),
    '/var/task/Templates', // explicit Netlify Lambda path as a safe fallback
  ];

  // import.meta.url is unreliable in some esbuild bundle modes; guard it.
  try {
    if (typeof import.meta.url === 'string') {
      const dir = dirname(fileURLToPath(import.meta.url));
      candidates.push(join(dir, '..', '..', '..', 'Templates')); // local: from shared/
      candidates.push(join(dir, '..', '..', 'Templates'));        // local: from functions/
    }
  } catch { /* import.meta.url unavailable in this bundle context — skip */ }

  return candidates;
}

// Simple in-memory cache — functions warm up quickly, reuse across invocations
const cache = new Map();

/**
 * Load an HTML template file and return its content.
 * Tries multiple directory candidates and caches after first successful load.
 * @param {string} filename  e.g. 'PasswordReset.html'
 * @returns {Promise<string>} raw HTML string
 */
export async function loadTemplate(filename) {
  if (cache.has(filename)) return cache.get(filename);

  const candidates = getTemplatesDir();
  let lastErr;

  for (const dir of candidates) {
    try {
      const content = await readFile(join(dir, filename), 'utf8');
      cache.set(filename, content);
      return content;
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(`Template "${filename}" not found. Tried: ${candidates.join(', ')}. Last error: ${lastErr?.message}`);
}

/**
 * Clear template cache (useful for testing).
 */
export function clearCache() {
  cache.clear();
}
