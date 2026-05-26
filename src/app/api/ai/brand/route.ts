import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import path from 'path'
import { BrandIdentitySchema, type BrandIdentity } from '@/lib/brand-identity'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'

const BRAND_PATH = path.join(process.cwd(), 'brand-identity.json')

function loadBrandIdentity(): BrandIdentity | null {
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

function saveBrandIdentity(brand: BrandIdentity): void {
  try {
    writeFileSync(BRAND_PATH, JSON.stringify(brand, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save brand identity:', error)
    throw error
  }
}

export async function GET() {
  const brand = loadBrandIdentity()
  return NextResponse.json({ brand })
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 20 req/min.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = BrandIdentitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid brand identity', details: parsed.error.format() },
        { status: 400 }
      )
    }

    saveBrandIdentity(parsed.data)
    return NextResponse.json({ success: true, brand: parsed.data })
  } catch (error) {
    console.error('Brand identity save error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
