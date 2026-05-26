import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { aiManager, type SocialPlatform, type ArticleLength, type CarouselPlatform, type VideoPromptBlocks } from '@/lib/ai/provider-manager'
import { type AIProvider } from '@/lib/ai/server-keys'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'

const chatSchema = z.object({
  type: z.enum(['social_post', 'article_draft', 'article_enrich', 'image_description', 'research', 'carousel_script', 'video_prompt_enhance']),
  sourceContent: z.string().optional(),
  platform: z.enum(['twitter', 'linkedin', 'instagram', 'facebook', 'telegram', 'tiktok']).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  topics: z.string().optional(),
  tone: z.string().optional(),
  lengthTarget: z.enum(['short', 'medium', 'long']).optional(),
  content: z.string().optional(),
  title: z.string().optional(),
  blocks: z.object({
    scene: z.string(),
    style: z.string(),
    camera: z.string(),
    movement: z.string(),
    lighting: z.string(),
    duration: z.string(),
    aspectRatio: z.string(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 20 req/min.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { type, provider, ...data } = parsed.data
    const aiProvider = (provider as AIProvider) || undefined

    switch (type) {
      case 'social_post': {
        if (!data.sourceContent || !data.platform) {
          return NextResponse.json(
            { error: 'sourceContent and platform are required' },
            { status: 400 }
          )
        }
        const result = await aiManager.generateSocialContent(
          data.sourceContent,
          data.platform as SocialPlatform,
          aiProvider,
          data.model
        )
        return NextResponse.json(result)
      }

      case 'article_draft': {
        if (!data.topics || !data.tone || !data.lengthTarget) {
          return NextResponse.json(
            { error: 'topics, tone and lengthTarget are required' },
            { status: 400 }
          )
        }
        const result = await aiManager.draftArticle(
          data.topics,
          data.tone as any,
          data.lengthTarget as ArticleLength,
          aiProvider,
          data.model
        )
        return NextResponse.json(result)
      }

      case 'article_enrich': {
        if (!data.content) {
          return NextResponse.json(
            { error: 'content is required' },
            { status: 400 }
          )
        }
        const enriched = await aiManager.enrichArticleContent(data.content, aiProvider, data.model)
        return NextResponse.json(enriched)
      }

      case 'image_description': {
        if (!data.title || !data.content) {
          return NextResponse.json(
            { error: 'title and content are required' },
            { status: 400 }
          )
        }
        const descResult = await aiManager.generateImageDescription(
          data.title,
          data.content,
          aiProvider,
          data.model
        )
        return NextResponse.json(descResult)
      }

      case 'research': {
        if (!data.topics) {
          return NextResponse.json(
            { error: 'topics is required' },
            { status: 400 }
          )
        }
        const result = await aiManager.research(data.topics, aiProvider, data.model)
        return NextResponse.json(result)
      }

      case 'carousel_script': {
        if (!data.sourceContent || !data.platform) {
          return NextResponse.json(
            { error: 'sourceContent and platform are required' },
            { status: 400 }
          )
        }
        const result = await aiManager.generateCarouselScript(
          data.sourceContent,
          data.platform as CarouselPlatform,
          aiProvider,
          data.model
        )
        return NextResponse.json(result)
      }

      case 'video_prompt_enhance': {
        if (!data.blocks) {
          return NextResponse.json(
            { error: 'blocks are required' },
            { status: 400 }
          )
        }
        const result = await aiManager.enhanceVideoPrompt(
          data.blocks as VideoPromptBlocks,
          aiProvider,
          data.model
        )
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
