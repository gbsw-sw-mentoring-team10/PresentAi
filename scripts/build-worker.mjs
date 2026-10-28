import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'

// Keep the Vite app unchanged and package its output into a self-contained Worker.
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}
const assets = Object.create(null)
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'server' || entry.name === '.openai') continue
    const relative = `${prefix}/${entry.name}`
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) await collect(filename, relative)
    else if (entry.isFile())
      assets[relative] = [
        mimeTypes[path.extname(filename)] || 'application/octet-stream',
        (await readFile(filename)).toString('base64'),
      ]
  }
}
await collect('dist')
const proxy = await readFile('worker/proxy.js', 'utf8')
const worker = (await readFile('worker/index.js', 'utf8')).replace(
  "import { proxyApi } from './proxy.js'",
  '',
)
await mkdir('dist/server', { recursive: true })
await mkdir('dist/.openai', { recursive: true })
await writeFile(
  'dist/server/index.js',
  `${proxy}\n${worker}\nexport default createWorker(${JSON.stringify(assets)});\n`,
)
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json')
console.log(`Worker ready: ${Object.keys(assets).length} assets and presentation API proxy`)
