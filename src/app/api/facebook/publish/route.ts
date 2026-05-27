import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { loadFacebookSettings } from '@/lib/facebook-settings'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'

const publishSchema = z.object({
  page_id: z.string().min(1).optional(),
  post_type: z.enum(['text', 'photo']),
  text_content: z.string().min(1),
  media_url: z.string().url().optional().or(z.literal('')),
  link: z.string().url().optional().or(z.literal('')),
})

function metaErrorMessage(body: any, status: number): string {
  const error = body?.error
  if (!error) return `Meta API error ${status}`

  const code = error.code ? `Code ${error.code}` : `HTTP ${status}`
  const subcode = error.error_subcode ? ` / sous-code ${error.error_subcode}` : ''
  return `${code}${subcode} : ${error.message || 'Erreur Meta Graph API'}`
}

async function publishViaN8n(payload: z.infer<typeof publishSchema>) {
  const webhookUrl = process.env.FACEBOOK_N8N_WEBHOOK_URL
  if (!webhookUrl) {
    throw new Error('FACEBOOK_N8N_WEBHOOK_URL manquant dans .env.local')
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page_id: payload.page_id,
      post_type: payload.post_type,
      text_content: payload.text_content,
      media_url: payload.media_url || undefined,
    }),
  })

  const text = await res.text()
  let data: unknown = text
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    // keep raw response
  }

  if (!res.ok) {
    throw new Error(`n8n webhook error ${res.status}: ${text}`)
  }

  return { provider: 'n8n', response: data }
}

async function publishViaMeta(payload: z.infer<typeof publishSchema>, graphVersion: string) {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  if (!token) {
    throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN manquant dans .env.local')
  }
  if (!payload.page_id) {
    throw new Error('page_id manquant')
  }

  const baseUrl = `https://graph.facebook.com/${graphVersion}/${payload.page_id}`
  const endpoint = payload.post_type === 'photo' ? `${baseUrl}/photos` : `${baseUrl}/feed`

  const body =
    payload.post_type === 'photo'
      ? {
          url: payload.media_url,
          caption: payload.text_content,
          published: true,
        }
      : {
          message: payload.text_content,
          link: payload.link || undefined,
        }

  if (payload.post_type === 'photo' && !payload.media_url) {
    throw new Error('media_url est obligatoire pour post_type=photo')
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(metaErrorMessage(data, res.status))
  }

  return { provider: 'meta', response: data }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const settings = loadFacebookSettings()
    const body = await request.json()
    const parsed = publishSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid Facebook publish payload', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const payload = {
      ...parsed.data,
      page_id: parsed.data.page_id || settings.pageId,
    }

    const result =
      settings.mode === 'n8n'
        ? await publishViaN8n(payload)
        : await publishViaMeta(payload, settings.graphVersion)

    return NextResponse.json({
      success: true,
      mode: settings.mode,
      payload: {
        page_id: payload.page_id,
        post_type: payload.post_type,
        text_content: payload.text_content,
        media_url: payload.media_url || undefined,
      },
      result,
    })
  } catch (error) {
    console.error('Facebook publish error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
