import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  
  // Use JWT_SECRET from environment. Fallback only for local development if not set yet.
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_only_change_in_prod'
  
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login')
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/admin') ||
    (pathname.startsWith('/api') && !pathname.startsWith('/api/auth'))

  let decoded = null
  if (token) {
    try {
      decoded = await verifyToken(token, secret)
    } catch (err) {
      console.error('[Middleware] Token verification error:', err)
    }
  }

  console.log(`[Middleware] Path: "${pathname}", Protected: ${isProtectedRoute}, AuthPage: ${isAuthPage}, TokenPresent: ${!!token}, ValidSession: ${!!decoded}`);

  // If trying to access a protected route without a valid session
  if (isProtectedRoute && !decoded) {
    if (pathname.startsWith('/api')) {
      console.log(`[Middleware] Blocking API: "${pathname}" - returning 401`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Redirect browser to login page
    const host = request.headers.get('host') || request.nextUrl.host
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const loginUrl = new URL('/login', `${protocol}://${host}`)
    
    console.log(`[Middleware] Redirecting browser from "${pathname}" to "${loginUrl.toString()}"`);
    return NextResponse.redirect(loginUrl)
  }

  // If trying to access the login page while already authenticated
  if (isAuthPage && decoded) {
    const host = request.headers.get('host') || request.nextUrl.host
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const dashboardUrl = new URL('/dashboard', `${protocol}://${host}`)
    console.log(`[Middleware] Redirecting authenticated user from "/login" to "${dashboardUrl.toString()}"`);
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Match all paths except internal Next.js assets, static files, and favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
