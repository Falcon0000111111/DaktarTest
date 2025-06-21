
"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        console.error("Error checking admin status:", error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(data);
      }
    } else {
      setIsAdmin(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAdminStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        checkAdminStatus();
      }
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  return { isAdmin, isLoading };
}
