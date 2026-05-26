import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { getClientIP } from '@/lib/get-ip'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const batPath = path.join(process.cwd(), 'restart.bat')

    // Detached spawn so it survives after this process is killed
    const child = spawn('cmd', ['/c', 'start', batPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })

    child.unref()

    return NextResponse.json({
      success: true,
      message: 'Redémarrage en cours... Le serveur sera de retour dans ~5 secondes.',
    })
  } catch (error) {
    console.error('Restart error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Restart failed' },
      { status: 500 }
    )
  }
}
