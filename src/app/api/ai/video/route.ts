import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { aiManager } from '@/lib/ai/provider-manager'
import { type AIProvider } from '@/lib/ai/server-keys'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'

const videoSchema = z.object({
  prompt: z.string(),
  provider: z.string(),
  model: z.string().optional(),
  imageUrl: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 20 req/min.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = videoSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { prompt, provider, model, imageUrl } = parsed.data
    const aiProvider = provider as AIProvider

    const result = await aiManager.generateVideo(prompt, aiProvider, model, imageUrl)

    return NextResponse.json({
      ...result,
      prompt,
      provider: aiProvider,
      model: model || 'default',
    })
  } catch (error) {
    console.error('AI video error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
