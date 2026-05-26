import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { aiManager } from '@/lib/ai/provider-manager'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'

const scrapeSchema = z.object({
  url: z.string().url(),
})

function isPrivateIP(urlStr: string): boolean {
  try {
    const url = new URL(urlStr)
    const hostname = url.hostname
    // Block localhost and private IPs
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('0.') ||
      hostname === '::1'
    ) {
      return true
    }
    return false
  } catch {
    return true
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 20 req/min.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = scrapeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { url } = parsed.data

    if (isPrivateIP(url)) {
      return NextResponse.json(
        { error: 'SSRF protection: private IPs are not allowed' },
        { status: 403 }
      )
    }

    const result = await aiManager.scrapeUrl(url)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
