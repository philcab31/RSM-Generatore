export type AIProvider =
  | 'gemini'
  | 'openai'
  | 'perplexity'
  | 'deepseek'
  | 'fal'
  | 'leonardo'
  | 'freepik'
  | 'magnific'

export const KEY_MAP: Record<AIProvider, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  fal: 'FAL_API_KEY',
  leonardo: 'LEONARDO_API_KEY',
  freepik: 'FREEPIK_API_KEY',
  magnific: 'MAGNIFIC_API_KEY',
}

export function getServerKey(provider: AIProvider): string | undefined {
  const envKey = KEY_MAP[provider]
  return process.env[envKey]
}

export function getProviderStatus(): Record<AIProvider, boolean> {
  return {
    gemini: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    perplexity: !!process.env.PERPLEXITY_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    fal: !!process.env.FAL_API_KEY,
    leonardo: !!process.env.LEONARDO_API_KEY,
    freepik: !!process.env.FREEPIK_API_KEY,
    magnific: !!process.env.MAGNIFIC_API_KEY,
  }
}
