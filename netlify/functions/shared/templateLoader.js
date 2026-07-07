// Lazy-loading, in-memory cached HTML template loader for Netlify Functions
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// With esbuild bundling, __dirname points to the bundled function directory.
// process.cwd() is the repo root on Netlify Lambda (/var/task).
// We try multiple candidate paths so it works both locally and on Netlify.
function getTemplatesDir() {
  const candidates = [
    // Netlify Lambda: process.cwd() = /var/task (repo root)
    join(process.cwd(), 'Templates'),
    // Local dev: 3 levels up from netlify/functions/shared/
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'Templates'),
    // Fallback: 2 levels up (if bundled file lives in netlify/functions/)
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'Templates'),
  ];
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
