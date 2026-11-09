import { cp, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')))
for (const name of ['cmaps', 'standard_fonts', 'wasm']) {
  await mkdir(`public/pdfjs/${name}`, { recursive: true })
  await cp(join(root, name), `public/pdfjs/${name}`, { recursive: true })
}
