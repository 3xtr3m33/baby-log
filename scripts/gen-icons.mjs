// Генерация иконок PWA из public/icon.svg.
// Запускается автоматически перед сборкой: npm run build.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'public', 'icon.svg')

const targets = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'favicon.png', size: 64 },
]

const svg = await readFile(src)

for (const { name, size } of targets) {
  const png = await sharp(svg, { density: 512 }).resize(size, size).png().toBuffer()
  await writeFile(join(root, 'public', name), png)
  console.log(`icon: ${name} (${size}x${size})`)
}
