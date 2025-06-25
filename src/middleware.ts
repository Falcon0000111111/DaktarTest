import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request cookies as well. This is crucial
          // for Server Components deciding whether to render page content or redirects.
          req.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request cookies as well. This is crucial
          // for Server Components deciding whether to render page content or redirects.
          req.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if expired - important to do before accessing session
  const { data: { session: refreshedSession } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Auth routes
  if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup')) {
    if (refreshedSession) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return response;
  }

  // Protected routes
  const protectedPaths = ['/dashboard', '/admin'];
  if (protectedPaths.some(p => pathname.startsWith(p))) {
    if (!refreshedSession) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }
  
  // Root page redirect
  if (pathname === '/') {
    if (refreshedSession) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (Supabase auth callback)
     * - api/ (API routes if any)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api/).*)',
  ],
};
