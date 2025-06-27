
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function useAdminStatus() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isChecking = useRef(false);

  const checkAdminStatus = useCallback(async () => {
    if (isChecking.current) return;
    isChecking.current = true;

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (error) {
          console.error("Error checking admin status:", error.message);
          setIsAdmin(false);
        } else {
          setIsAdmin(data);
        }
      } catch (e) {
        console.error("Exception checking admin status:", (e as Error).message);
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
    setIsLoading(false);
    isChecking.current = false;
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
