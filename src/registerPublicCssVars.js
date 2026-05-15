/**
 * Set CSS custom properties for `url(/public/...)` assets so they respect Vite `base`
 * (e.g. GitHub Pages subpaths). Imported from main.js before `./assets/styles.css`.
 */
import { publicPath } from '@/utils/publicPath'

function cssUrl(absolutePublicPath) {
  return `url(${JSON.stringify(publicPath(absolutePublicPath))})`
}

if (typeof document !== 'undefined' && document.documentElement) {
  const s = document.documentElement.style
  s.setProperty('--pub-url-font-princess', cssUrl('/Fonts/PrincessSofia-Regular.ttf'))
  s.setProperty('--pub-url-font-reenie', cssUrl('/Fonts/ReenieBeanie.ttf'))
  s.setProperty('--pub-url-bg-fiery', cssUrl('/Background/fiery-heart.jpg'))
  s.setProperty('--pub-url-bg-triangles', cssUrl('/Background/davidrockdesign-triangles-1430105.svg'))
}
