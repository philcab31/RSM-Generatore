import { z } from 'zod'

export const LogoPositionSchema = z.enum([
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
  'center',
])

export type LogoPosition = z.infer<typeof LogoPositionSchema>

export const BrandColorSchema = z.object({
  name: z.string().max(50).default(''),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
  enabled: z.boolean().default(true),
})

export type BrandColor = z.infer<typeof BrandColorSchema>

export const BrandIdentitySchema = z.object({
  companyName: z.string().min(1).max(200),
  tagline: z.string().max(500).optional(),
  targetAudience: z.string().max(2000),
  targetExclusions: z.string().max(2000).optional(),
  toneOfVoice: z.string().max(2000).optional(),
  forbiddenTopics: z.string().max(2000).optional(),

  colors: z.array(BrandColorSchema).max(5).default([
    { name: 'Primaire', hex: '#3b82f6', enabled: true },
    { name: 'Secondaire', hex: '#64748b', enabled: true },
    { name: 'Accent', hex: '#f59e0b', enabled: true },
    { name: '', hex: '#10b981', enabled: false },
    { name: '', hex: '#ef4444', enabled: false },
  ]),
  fontStyle: z.string().max(500).optional(),
  visualMood: z.string().max(2000).optional(),
  visualExclusions: z.string().max(2000).optional(),

  logoBase64: z.string().max(5_000_000).optional(),
  logoPosition: LogoPositionSchema.default('bottom-right'),
  logoSize: z.number().min(5).max(50).default(15),
  logoOpacity: z.number().min(0).max(100).default(100),

  referenceImages: z.array(z.string().max(3_000_000)).max(3).default([]),
})

export type BrandIdentity = z.infer<typeof BrandIdentitySchema>

export const defaultBrandIdentity: BrandIdentity = {
  companyName: '',
  tagline: '',
  targetAudience: '',
  targetExclusions: '',
  toneOfVoice: '',
  forbiddenTopics: '',
  colors: [
    { name: 'Primaire', hex: '#3b82f6', enabled: true },
    { name: 'Secondaire', hex: '#64748b', enabled: true },
    { name: 'Accent', hex: '#f59e0b', enabled: true },
    { name: '', hex: '#10b981', enabled: false },
    { name: '', hex: '#ef4444', enabled: false },
  ],
  fontStyle: '',
  visualMood: '',
  visualExclusions: '',
  logoBase64: undefined,
  logoPosition: 'bottom-right',
  logoSize: 15,
  logoOpacity: 100,
  referenceImages: [],
}

export function isBrandIdentityConfigured(brand: BrandIdentity): boolean {
  return brand.companyName.trim().length > 0 || brand.targetAudience.trim().length > 0
}

export function buildBrandTextBlock(brand: BrandIdentity | null): string {
  if (!brand) return ''
  const parts: string[] = []
  if (brand.companyName) parts.push(`Entreprise : ${brand.companyName}`)
  if (brand.tagline) parts.push(`Baseline : ${brand.tagline}`)
  if (brand.targetAudience) parts.push(`Cible prioritaire : ${brand.targetAudience}`)
  if (brand.targetExclusions) parts.push(`Exclusions de cible : ${brand.targetExclusions}`)
  if (brand.toneOfVoice) parts.push(`Ton de voix : ${brand.toneOfVoice}`)
  if (brand.forbiddenTopics) parts.push(`Sujets / mentions à éviter : ${brand.forbiddenTopics}`)

  if (parts.length === 0) return ''
  return `[IDENTITÉ MARQUE]\n${parts.join('\n')}`
}

export function buildBrandVisualBlock(brand: BrandIdentity | null): string {
  if (!brand) return ''
  const parts: string[] = []
  if (brand.visualMood) parts.push(`Style visuel : ${brand.visualMood}`)

  const activeColors = brand.colors.filter((c) => c.enabled && c.hex)
  if (activeColors.length > 0) {
    const colorDesc = activeColors
      .map((c) => (c.name ? `${c.name} ${c.hex}` : c.hex))
      .join(', ')
    parts.push(`Palette de couleurs : ${colorDesc}`)
  }

  if (brand.fontStyle) parts.push(`Typographie : ${brand.fontStyle}`)
  if (brand.visualExclusions) parts.push(`Exclusions visuelles : ${brand.visualExclusions}`)

  if (parts.length === 0) return ''
  return parts.join('. ')
}

export function buildReferenceImagePrompt(referenceImages: string[], basePrompt: string): string {
  const count = referenceImages.length
  if (count === 0) return basePrompt

  let instruction = ''

  if (count === 1) {
    instruction =
      'Image 1 (référence principale) : utilise cette image comme référence absolue de style, d\'ambiance, de palette de couleurs, de matériaux et de composition. Reproduis fidèlement son esthétique visuelle dans le rendu final.'
  } else if (count === 2) {
    instruction =
      'Image 1 (style & ambiance) : référence visuelle pour le style global, la palette de couleurs, les matériaux, les textures et l\'ambiance. Image 2 (sujet & composition) : référence pour le sujet principal, la pose, le cadrage et la mise en scène. Applique strictement le style de l\'Image 1 au sujet et à la composition de l\'Image 2.'
  } else {
    instruction =
      'Image 1 (style principal) : référence de style, de matériau, de texture et de traitement visuel. Image 2 (sujet principal) : référence pour le sujet, la pose, le cadrage et la mise en scène principale. Image 3 (ambiance & composition secondaire) : référence d\'éclairage, d\'atmosphère, d\'angle de vue ou d\'éléments d\'arrière-plan. Compose le rendu final en combinant le style de l\'Image 1, le sujet de l\'Image 2, et l\'ambiance/composition de l\'Image 3.'
  }

  return `${instruction}\n\nConsignes additionnelles pour le rendu : ${basePrompt}`
}

export function sanitizeBrandIdentity(partial: unknown): BrandIdentity {
  const parsed = BrandIdentitySchema.safeParse(partial)
  if (parsed.success) return parsed.data

  // Fallback: merge with defaults for partial data
  const fallback = { ...defaultBrandIdentity, ...(partial as Partial<BrandIdentity>) }

  // Migrate old flat color fields to new colors array if needed
  const p = partial as Record<string, unknown>
  if (p.primaryColor || p.secondaryColor || p.accentColor) {
    fallback.colors = [
      { name: 'Primaire', hex: String(p.primaryColor || '#3b82f6'), enabled: true },
      { name: 'Secondaire', hex: String(p.secondaryColor || '#64748b'), enabled: true },
      { name: 'Accent', hex: String(p.accentColor || '#f59e0b'), enabled: true },
      { name: '', hex: '#10b981', enabled: false },
      { name: '', hex: '#ef4444', enabled: false },
    ]
  }

  return fallback
}
