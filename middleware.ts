import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase session
  const res = await updateSession(request)
  
  // 2. Perform authentication checks for protected routes
  const path = request.nextUrl.pathname
  
  // Define protected routes
  const isDashboardRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/skills') || 
    path.startsWith('/logs')

  const isAuthRoute = 
    path.startsWith('/login') || 
    path.startsWith('/signup')

  if (isDashboardRoute || isAuthRoute) {
    // Create local client to query cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // Read-only in request phase, updates handled in updateSession
          },
        },
      }
    )
    
    const { data: { user } } = await supabase.auth.getUser()

    if (isDashboardRoute && !user) {
      // Not logged in, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (isAuthRoute && user) {
      // Already logged in, redirect to dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
