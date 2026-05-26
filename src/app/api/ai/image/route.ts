import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { aiManager, type PromptTrace } from '@/lib/ai/provider-manager'
import { type AIProvider } from '@/lib/ai/server-keys'
import { DEFAULT_PROMPTS } from '@/lib/ai/prompts-default'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'
import { buildBrandVisualBlock, buildReferenceImagePrompt } from '@/lib/brand-identity'
import { loadBrandIdentityServer } from '@/lib/brand-identity-server'

const imageSchema = z.object({
  networkPost: z.string(),
  sourceContent: z.string(),
  platform: z.string(),
  modelId: z.string().optional(),
  provider: z.string(),
})

function getPrompt(id: string, variables: Record<string, string>): string {
  let prompt = DEFAULT_PROMPTS[id] || ''
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return prompt
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 20 req/min.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = imageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { networkPost, sourceContent, platform, provider, modelId } = parsed.data
    const aiProvider = provider as AIProvider

    // ── Étape 1 : générer la description visuelle ──
    const descriptionPrompt = getPrompt('image_description_generator', {
      title: networkPost.slice(0, 100),
      content: sourceContent,
    })
    const { description, trace: descTrace } = await aiManager.generateImageDescription(
      networkPost.slice(0, 100),
      sourceContent,
      aiProvider
    )

    // ── Étape 2 : assembler le prompt final avec le style du réseau + DA visuelle ──
    const brand = loadBrandIdentityServer()
    const visualBlock = buildBrandVisualBlock(brand)
    const stylePromptId = `social_${platform}_style` as keyof typeof DEFAULT_PROMPTS
    const style = DEFAULT_PROMPTS[stylePromptId] || ''
    const finalPrompt = [description, visualBlock, style].filter(Boolean).join('. ').trim()

    // ── Étape 3 : générer l'image (avec images de référence si configurées) ──
    const result = await aiManager.generateImage(finalPrompt, aiProvider, modelId, brand?.referenceImages)

    // ── Assemblage de la trace complète ──
    const trace: PromptTrace = { steps: [] }

    // Step 1: Description generation
    if (descTrace.steps.length > 0) {
      trace.steps.push({
        step: 1,
        name: 'Étape 1 — Description visuelle (LLM)',
        description: 'Le LLM analyse le contenu source et produit une description visuelle concise en anglais.',
        systemPrompt: descTrace.steps[0].systemPrompt,
        userPrompt: descriptionPrompt,
        assembledPrompt: descTrace.steps[0].assembledPrompt,
        output: description,
        metadata: descTrace.steps[0].metadata,
      })
    }

    // Step 2: Prompt assembly
    trace.steps.push({
      step: 2,
      name: 'Étape 2 — Assemblage du prompt final',
      description: 'Le prompt final est construit en combinant la description générée, les contraintes visuelles de la marque, et le style propre au réseau social.',
      userPrompt: finalPrompt,
      metadata: {
        descriptionLength: description.length,
        visualBlockLength: visualBlock?.length || 0,
        styleLength: style?.length || 0,
        platform,
        hasVisualBlock: !!visualBlock,
        hasStyle: !!style,
      },
    })

    // Step 3: Image generation
    const refCount = brand?.referenceImages?.length || 0
    const refPrompt = refCount > 0 && brand ? buildReferenceImagePrompt(brand.referenceImages, finalPrompt) : undefined
    const imgTrace = result.trace
    if (imgTrace && imgTrace.steps.length > 0) {
      for (const imgStep of imgTrace.steps) {
        trace.steps.push({
          step: trace.steps.length + 1,
          name: imgStep.name,
          description: imgStep.description,
          userPrompt: imgStep.userPrompt || refPrompt || finalPrompt,
          metadata: { ...imgStep.metadata, referenceImagesCount: refCount },
        })
      }
    } else {
      trace.steps.push({
        step: 3,
        name: 'Étape 3 — Génération d\'image',
        description: refCount > 0
          ? `Appel à l'API image avec ${refCount} image(s) de référence.`
          : 'Appel à l\'API image sans image de référence.',
        userPrompt: refPrompt || finalPrompt,
        metadata: { referenceImagesCount: refCount, modelUsed: result.modelUsed },
      })
    }

    return NextResponse.json({
      ...result,
      finalPrompt,
      description,
      trace,
    })
  } catch (error) {
    console.error('AI image error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
