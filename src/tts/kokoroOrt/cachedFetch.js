/**
 * Fetch with Cache API persistence so Kokoro model and voice files are not
 * re-downloaded on every page load. Uses the same cache in main thread and worker.
 */
const CACHE_NAME = 'kokoro-model-v1'

/**
 * Fetch a URL, using the cache when available. On first load stores the response
 * in the cache; on subsequent loads returns the cached response (no network).
 * @param {string} url - Full URL to fetch
 * @returns {Promise<Response>}
 */
export async function cachedFetch(url) {
  if (typeof caches === 'undefined') {
    return fetch(url)
  }
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(url)
  if (cached) return cached
  const res = await fetch(url)
  if (!res.ok) return res
  await cache.put(url, res.clone())
  return res
}
