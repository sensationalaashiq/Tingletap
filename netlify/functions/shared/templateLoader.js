// Lazy-loading, in-memory cached HTML template loader for Netlify Functions
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Netlify Functions run from repo root, so Templates/ is 3 levels up from shared/
const TEMPLATES_DIR = join(__dirname, '..', '..', '..', 'Templates');

// Simple in-memory cache — functions warm up quickly, reuse across invocations
const cache = new Map();

/**
 * Load an HTML template file and return its content.
 * Templates are cached after first load.
 * @param {string} filename  e.g. 'PasswordReset.html'
 * @returns {Promise<string>} raw HTML string
 */
export async function loadTemplate(filename) {
  if (cache.has(filename)) return cache.get(filename);

  const filePath = join(TEMPLATES_DIR, filename);
  const content  = await readFile(filePath, 'utf8');
  cache.set(filename, content);
  return content;
}

/**
 * Clear template cache (useful for testing).
 */
export function clearCache() {
  cache.clear();
}
