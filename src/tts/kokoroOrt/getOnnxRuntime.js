/**
 * Get onnxruntime-web with WebGPU preferred, WASM fallback (Safari).
 * Uses executionProviders: ['webgpu', 'wasm'] so Safari gets WASM.
 *
 * We intentionally do NOT set ort.env.wasm.wasmPaths so the ONNX runtime
 * uses its bundled Emscripten module and resolves WASM via import.meta.url.
 * The Vite dev server's catch-all middleware (serve-onnx-wasm plugin) intercepts
 * any request for ort-wasm*.wasm files and serves them with correct MIME type
 * from node_modules/onnxruntime-web/dist/.
 */
let ortPromise = null

/**
 * @returns {Promise<typeof import('onnxruntime-web')>}
 */
export async function getOnnxRuntime() {
  if (ortPromise) return ortPromise
  ortPromise = (async () => {
    const ort = await import('onnxruntime-web')
    // Suppress verbose ONNX Runtime internal warnings (CPU vendor, EP assignment)
    if (ort.env) ort.env.logLevel = 'error'
    // Single-threaded WASM uses less memory; helps stay under limits on iOS/Safari
    if (typeof navigator !== 'undefined' && ort.env?.wasm) {
      const ua = navigator.userAgent || ''
      if (/AppleWebKit/.test(ua) && !/Chrome|Chromium/.test(ua)) ort.env.wasm.numThreads = 1
    }
    return ort
  })()
  return ortPromise
}
