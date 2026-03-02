/**
 * Browser stub for Node's "module" built-in.
 * espeak-ng uses `import('module')` only when ENVIRONMENT_IS_NODE; in the browser
 * that branch is never run. Vite still resolves the dynamic import and warns.
 * This stub is aliased so the bundler doesn't externalize "module".
 */
export function createRequire() {
  throw new Error(
    'createRequire is not available in the browser (Node "module" stub). ' +
      'espeak-ng should not call this in web/worker context.'
  )
}
export default { createRequire }
