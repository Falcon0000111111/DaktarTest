import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const supabase = createClient(); // Uses the server client from @/lib/supabase/server
  
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/auth/login');
  }

  return null; 
}
