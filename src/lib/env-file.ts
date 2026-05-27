import { existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const ENV_PATH = path.join(process.cwd(), '.env.local')

export async function updateEnvValues(updates: Record<string, string | undefined>): Promise<void> {
  let content = ''
  if (existsSync(ENV_PATH)) {
    content = await readFile(ENV_PATH, 'utf-8')
  }

  const lines = content.split('\n')
  const seen = new Set<string>()
  const nextLines = lines.map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line)
    if (!match) return line

    const key = match[1]
    if (!(key in updates)) return line

    seen.add(key)
    const value = updates[key]
    if (value === undefined) return line
    return `${key}=${value}`
  })

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && !seen.has(key)) {
      nextLines.push(`${key}=${value}`)
    }
  }

  await writeFile(ENV_PATH, nextLines.join('\n').replace(/\n+$/, '') + '\n', 'utf-8')
}
