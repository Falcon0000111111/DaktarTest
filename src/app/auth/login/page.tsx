"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client"; // Updated import
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LogIn, BookOpenCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient(); // Updated client creation
  const { toast } = useToast();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.endsWith("@gmail.com")) {
      toast({
        title: "Invalid Email",
        description: "Only @gmail.com accounts are allowed.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Redirecting to dashboard...",
        });
        router.push("/dashboard");
        router.refresh(); 
      }
    } catch (error) {
      toast({
        title: "An unexpected error occurred",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <BookOpenCheck className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Welcome to FinalQuiz</CardTitle>
          <CardDescription className="text-md">Sign in to access your quizzes and workspaces.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
              {!loading && <LogIn className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
