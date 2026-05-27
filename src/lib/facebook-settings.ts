import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'

export const FacebookPublishModeSchema = z.enum(['n8n', 'direct'])
export type FacebookPublishMode = z.infer<typeof FacebookPublishModeSchema>

export const FacebookSettingsSchema = z.object({
  mode: FacebookPublishModeSchema.default('n8n'),
  pageId: z.string().max(100).default(''),
  graphVersion: z.string().regex(/^v\d+\.\d+$/).default('v20.0'),
})

export type FacebookSettings = z.infer<typeof FacebookSettingsSchema>

export const defaultFacebookSettings: FacebookSettings = {
  mode: 'n8n',
  pageId: '',
  graphVersion: 'v20.0',
}

const SETTINGS_PATH = path.join(process.cwd(), 'facebook-settings.json')

export function loadFacebookSettings(): FacebookSettings {
  try {
    if (!existsSync(SETTINGS_PATH)) return defaultFacebookSettings
    const raw = readFileSync(SETTINGS_PATH, 'utf-8')
    const parsed = FacebookSettingsSchema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
  } catch {
    // ignore malformed settings and use defaults
  }
  return defaultFacebookSettings
}

export function saveFacebookSettings(settings: FacebookSettings): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}
