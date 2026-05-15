/**
 * Prefix a site-root path for static assets under `public/` (e.g. `/Images/…`, `/models/…`).
 * Uses Vite `import.meta.env.BASE_URL` so GitHub Pages and other subpath deploys resolve correctly.
 * @param {string} path - Absolute-style path starting with `/`, e.g. `/audio/static/foo.wav`
 * @returns {string}
 */
export function publicPath(path) {
  const raw = String(path || '')
  const trimmed = raw.startsWith('/') ? raw.slice(1) : raw
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/'
  if (!trimmed) {
    return base === '/' ? '/' : base.endsWith('/') ? base : `${base}/`
  }
  if (base === '/' || base === '') return `/${trimmed}`
  const b = base.endsWith('/') ? base : `${base}/`
  return `${b}${trimmed}`
}
