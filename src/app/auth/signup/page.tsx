"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { UserPlus, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({
        title: "Signup Failed",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Signup Failed",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signup Successful",
          description: "Please check your email to verify your account.",
        });
        router.push("/auth/login"); 
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
             <Stethoscope className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline">Create an Account</CardTitle>
          <CardDescription className="text-md">Join DaktarTest to start generating quizzes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                type="text"
                placeholder="e.g., Mahira Khan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>
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
                minLength={6}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 text-base"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
              {!loading && <UserPlus className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/auth/login">Log in</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
