import { NextRequest, NextResponse } from 'next/server'
import { loadMergedPrompts, saveCustomPrompts } from '@/lib/ai/prompts-store'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const prompts = loadMergedPrompts()
    return NextResponse.json(prompts)
  } catch (error) {
    console.error('Load prompts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load prompts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await request.json()
    saveCustomPrompts(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save prompts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save prompts' },
      { status: 500 }
    )
  }
}
