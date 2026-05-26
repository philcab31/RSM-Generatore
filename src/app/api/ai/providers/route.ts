import { NextResponse } from 'next/server'
import { getProviderStatus } from '@/lib/ai/server-keys'

export async function GET() {
  try {
    const status = getProviderStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('Providers status error:', error)
    return NextResponse.json(
      { error: 'Failed to get provider status' },
      { status: 500 }
    )
  }
}
