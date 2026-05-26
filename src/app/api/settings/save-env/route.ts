import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { type AIProvider, KEY_MAP } from '@/lib/ai/server-keys'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const schema = z.object({
  provider: z.string(),
  key: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { provider, key } = parsed.data
    const envKey = KEY_MAP[provider as AIProvider]
    if (!envKey) {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }

    const envPath = path.join(process.cwd(), '.env.local')
    let content = ''

    if (existsSync(envPath)) {
      content = await readFile(envPath, 'utf-8')
    }

    const lines = content.split('\n')
    let found = false
    const newLines = lines.map((line) => {
      if (line.startsWith(`${envKey}=`)) {
        found = true
        return `${envKey}=${key}`
      }
      return line
    })

    if (!found) {
      newLines.push(`${envKey}=${key}`)
    }

    await writeFile(envPath, newLines.join('\n') + '\n', 'utf-8')

    return NextResponse.json({
      success: true,
      message: `Clé ${provider} sauvegardée. Redémarre le serveur pour prendre en compte la nouvelle clé.`,
    })
  } catch (error) {
    console.error('Save env error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
