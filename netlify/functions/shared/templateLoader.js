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
 * Load an HTML template file, substitute {{APP_NAME}} and any extra vars,
 * then return the result. Raw HTML is cached; substitution runs every call
 * so dynamic per-request variables (e.g. {{user_name}}) are always fresh.
 * @param {string} filename  e.g. 'PasswordReset.html'
 * @param {Record<string,string>} [vars]  extra key→value replacements
 * @returns {Promise<string>} HTML string with placeholders replaced
 */
export async function loadTemplate(filename, vars = {}) {
  let raw;
  if (cache.has(filename)) {
    raw = cache.get(filename);
  } else {
    const candidates = getTemplatesDir();
    let lastErr;
    for (const dir of candidates) {
      try {
        raw = await readFile(join(dir, filename), 'utf8');
        cache.set(filename, raw);
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (raw === undefined) {
      throw new Error(`Template "${filename}" not found. Tried: ${getTemplatesDir().join(', ')}. Last error: ${lastErr?.message}`);
    }
  }

  // Built-in substitutions
  const appName = process.env.BREVO_SENDER_NAME || 'App';
  let html = raw.replace(/\{\{APP_NAME\}\}/g, appName);

  // Caller-supplied substitutions (e.g. {{user_name}}, {{otp}})
  for (const [key, val] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val ?? ''));
  }

  return html;
}

/**
 * Clear template cache (useful for testing).
 */
export function clearCache() {
  cache.clear();
}
