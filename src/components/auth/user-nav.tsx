
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { LogOut, Moon, Sun, ShieldCheck, BarChartHorizontal, CreditCard } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useAdminStatus } from "@/hooks/use-admin-status";
import Link from "next/link";

export function UserNav() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Pick<Profile, 'llm_requests_count' | 'llm_request_limit'> | null>(null);
  const { theme, setTheme } = useTheme();
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('llm_requests_count, llm_request_limit')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching user profile for credits:", error);
      setProfile(null);
    } else {
      setProfile(profileData);
    }
  }, [supabase]);

  useEffect(() => {
    const getUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    };
    getUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
            fetchProfile(currentUser.id);
        } else {
            setProfile(null);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh(); 
  };

  if (!user) {
    return (
      <Button onClick={() => router.push("/auth/login")} variant="outline">
        Login
      </Button>
    );
  }

  const userEmail = user.email || "User";
  const fallbackName = userEmail.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={userEmail} />
            <AvatarFallback>{fallbackName}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.user_metadata?.full_name || userEmail}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profile && (
            <>
              <DropdownMenuItem disabled className="cursor-default focus:bg-transparent opacity-100">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Credits Used: {profile.llm_requests_count} / {profile.llm_request_limit}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
        )}
        <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/dashboard/performance">
                <BarChartHorizontal className="mr-2 h-4 w-4" />
                <span>Performance</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="cursor-pointer">
          {theme === 'dark' ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
        </DropdownMenuItem>

        {!isAdminLoading && isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin/knowledge-base">
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
