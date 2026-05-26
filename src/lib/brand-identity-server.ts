import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { BrandIdentitySchema, type BrandIdentity } from './brand-identity'

const BRAND_PATH = path.join(process.cwd(), 'brand-identity.json')

export function loadBrandIdentityServer(): BrandIdentity | null {
  try {
    if (existsSync(BRAND_PATH)) {
      const raw = readFileSync(BRAND_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      const result = BrandIdentitySchema.safeParse(parsed)
      if (result.success) return result.data
    }
  } catch {
    // ignore
  }
  return null
}
