import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'
import { getServerKey, type AIProvider } from '@/lib/ai/server-keys'

const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function buildInstruction(intent: string) {
  const base = `Tu analyses une image fournie par un utilisateur d'une application de génération de contenu social media.
Réponds en français uniquement.
Extrais les informations utiles pour rédiger ensuite des posts, carrousels, images, articles ou prompts vidéo.
Structure la réponse avec : sujet, éléments visibles, texte lisible éventuel, message principal, angles éditoriaux possibles, précautions.`

  if (intent === 'reuse_visual') {
    return `${base}
Cette image pourra aussi servir d'inspiration visuelle. Ajoute une section "Inspiration visuelle" décrivant composition, couleurs, style, éléments réutilisables et éléments à ne pas copier littéralement.`
  }

  return `${base}
Cette image sert d'abord à comprendre le contenu. Ne propose pas de recopier le visuel, concentre-toi sur ce qu'il permet d'expliquer.`
}

async function analyzeWithOpenAI(file: File, buffer: Buffer, instruction: string) {
  const apiKey = getServerKey('openai')
  if (!apiKey) return null

  const openai = new OpenAI({ apiKey })
  const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`
  const result = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.3,
  })

  return result.choices[0]?.message?.content || ''
}

async function analyzeWithGemini(file: File, buffer: Buffer, instruction: string) {
  const apiKey = getServerKey('gemini')
  if (!apiKey) return null

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent([
    instruction,
    {
      inlineData: {
        mimeType: file.type,
        data: buffer.toString('base64'),
      },
    },
  ])

  return result.response.text()
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 20 req/min.' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const provider = (formData.get('provider') || 'openai') as AIProvider
    const intent = String(formData.get('intent') || 'analyze_content')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG or WebP.' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image too large. Max 8MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const instruction = buildInstruction(intent)
    const preferred = provider === 'gemini' ? 'gemini' : 'openai'

    let content =
      preferred === 'gemini'
        ? await analyzeWithGemini(file, buffer, instruction)
        : await analyzeWithOpenAI(file, buffer, instruction)

    if (!content) {
      content =
        preferred === 'gemini'
          ? await analyzeWithOpenAI(file, buffer, instruction)
          : await analyzeWithGemini(file, buffer, instruction)
    }

    if (!content) {
      return NextResponse.json(
        { error: 'No vision-capable provider is configured.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('Vision analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
