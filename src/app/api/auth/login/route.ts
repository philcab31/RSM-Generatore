import { NextResponse } from 'next/server'
import { signToken } from '../../../../lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    // Retrieve credentials from environment. Fallback to 'admin'/'admin' only for local dev.
    const expectedUsername = process.env.ADMIN_USERNAME || 'admin'
    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin'
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only_change_in_prod'

    if (username === expectedUsername && password === expectedPassword) {
      // Create session valid for 7 days
      const exp = Date.now() + 7 * 24 * 60 * 60 * 1000
      const token = await signToken({ username, exp }, secret)

      const response = NextResponse.json({ success: true })
      
      // Set the session token in a secure, HTTP-only cookie
      response.cookies.set({
        name: 'session_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
      })

      return response
    }

    return NextResponse.json(
      { error: 'Identifiant ou mot de passe incorrect.' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    )
  }
}
