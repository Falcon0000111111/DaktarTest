import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // Keep NextRequest for compatibility if needed, but Request is standard
import type { Database } from '@/types/supabase';


export async function GET(request: NextRequest) { // Use NextRequest here
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // URL to redirect to after sign in process completes
      return NextResponse.redirect(new URL('/dashboard', requestUrl));
    }
    console.error('Error exchanging code for session:', error);
  }

  // URL to redirect to if something goes wrong
  return NextResponse.redirect(new URL('/auth/login?error=auth_callback_failed', requestUrl));
}
