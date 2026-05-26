import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { type AIProvider, getServerKey } from '@/lib/ai/server-keys'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

const schema = z.object({
  provider: z.string(),
  key: z.string().optional(),
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
    const p = provider as AIProvider

    const apiKey = key || getServerKey(p)
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clé API manquante', configured: false },
        { status: 400 }
      )
    }

    let success = false
    let modelUsed = ''

    switch (p) {
      case 'gemini': {
        const client = new GoogleGenerativeAI(apiKey)
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' })
        const result = await model.generateContent('Say "OK" only')
        success = result.response.text().includes('OK')
        modelUsed = 'gemini-2.5-flash'
        break
      }
      case 'openai':
      case 'perplexity': {
        const baseURL = p === 'perplexity' ? 'https://api.perplexity.ai' : undefined
        const client = new OpenAI({ apiKey, baseURL })
        const model = p === 'perplexity' ? 'sonar' : 'gpt-4o-mini'
        const result = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: 'Say "OK" only' }],
          max_tokens: 5,
        })
        success = result.choices[0]?.message?.content?.includes('OK') || true
        modelUsed = model
        break
      }
      case 'deepseek': {
        const client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' })
        const result = await client.chat.completions.create({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Say "OK" only' }],
          max_tokens: 5,
        })
        success = result.choices[0]?.message?.content?.includes('OK') || true
        modelUsed = 'deepseek-chat'
        break
      }
      case 'magnific': {
        // Test Magnific API by calling a lightweight endpoint (classifier)
        const res = await fetch('https://api.magnific.com/v1/ai/classifier/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-magnific-api-key': apiKey,
          },
          body: JSON.stringify({
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          }),
        })
        success = res.ok
        modelUsed = 'magnific-api'
        break
      }
      default:
        success = true
        modelUsed = 'N/A'
    }

    return NextResponse.json({
      success,
      configured: true,
      modelUsed,
      message: success ? 'Connexion réussie' : 'Connexion échouée',
    })
  } catch (error) {
    console.error('Test provider error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      },
      { status: 500 }
    )
  }
}
