
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export const createSupabaseServerClient = () => {
  // createServerComponentClient will automatically use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  // from environment variables when used in Server Components.
  return createServerComponentClient<Database>({
    cookies: cookies, // Pass the cookies function from next/headers directly
  });
};

// The createSupabaseRouteHandlerClient function previously defined here was unused.
// Route handlers, like src/app/auth/callback/route.ts, directly import and use 
// createRouteHandlerClient from '@supabase/auth-helpers-nextjs'.
