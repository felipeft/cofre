import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url))
const forbidden = [
  'onrender.com',
  'turso.io',
  'googleapis.com',
  'accounts.google.com',
  'fonts.googleapis.com',
  'VITE_API_URL',
  'GOOGLE_CLIENT_SECRET',
  'TURSO_AUTH_TOKEN',
  'Não foi possível conectar ao servidor',
]

async function filesRecursively(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? filesRecursively(target) : [target]
  }))
  return nested.flat()
}

const files = await filesRecursively(distDirectory)
const findings = []
for (const file of files) {
  const content = await readFile(file, 'utf8').catch(() => '')
  for (const marker of forbidden) {
    if (content.includes(marker)) findings.push(`${path.relative(distDirectory, file)} contém "${marker}"`)
  }
}

if (findings.length) {
  throw new Error(`Build Demo reprovado na auditoria de isolamento:\n${findings.join('\n')}`)
}

console.log(`Build Demo auditado: ${files.length} arquivos, nenhum endpoint, secret ou host privado conhecido encontrado.`)
