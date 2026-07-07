// Structured logger for Netlify Functions
const isProd = process.env.NODE_ENV === 'production' || process.env.NETLIFY === 'true';

function fmt(level, msg, meta = {}) {
  const entry = { level, msg, ts: new Date().toISOString(), ...meta };
  return isProd ? JSON.stringify(entry) : `[${level.toUpperCase()}] ${msg} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
}

export const log = {
  info:  (msg, meta) => console.log(fmt('info',  msg, meta)),
  warn:  (msg, meta) => console.warn(fmt('warn',  msg, meta)),
  error: (msg, meta) => console.error(fmt('error', msg, meta)),
  debug: (msg, meta) => { if (!isProd) console.debug(fmt('debug', msg, meta)); },
};
