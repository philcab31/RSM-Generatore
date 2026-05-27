import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  
  // Use JWT_SECRET from environment. Fallback only for local development if not set yet.
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only_change_in_prod'
  
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/admin') ||
    (request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/api/auth'))

  let decoded = null
  if (token) {
    decoded = await verifyToken(token, secret)
  }

  // If trying to access a protected route without a valid session
  if (isProtectedRoute && !decoded) {
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Redirect browser to login page
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If trying to access the login page while already authenticated
  if (isAuthPage && decoded) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Match all paths except internal Next.js assets, static files, and favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
