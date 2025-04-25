import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../lib/toast";
import { Theme } from "../../types/theme";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Github, Grid2x2, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface LoginFormProps {
  currentTheme: Theme;
  onSuccess: (type: "user" | "admin") => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ currentTheme, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Clear any existing sessions first
      await supabase.auth.signOut();

      const {
        data: { user },
        error,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!user) {
        throw new Error("No user returned from authentication");
      }

      // Check if this is an admin login attempt
      const adminLevel = user?.user_metadata?.admin_level || "user";
      if (loginType === "admin" && (!adminLevel || adminLevel === "user")) {
        throw new Error("Invalid admin credentials");
      }

      // Pass the login type to onSuccess
      onSuccess(loginType);
    } catch (err) {
      let errorMessage = "Invalid email or password. Please try again.";
      if (err instanceof Error && err.message === "Invalid admin credentials") {
        errorMessage = "Invalid admin credentials. You don't have admin access.";
      }
      setError(errorMessage);
      showToast(errorMessage, "error");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider: "github" | "google" | "azure") => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      setError(`Failed to sign in with ${provider}`);
      showToast(`Failed to sign in with ${provider}`, "error");
      console.error(`${provider} login error:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-[2rem] tracking-tighter">Login</CardTitle>
          <CardDescription className="text-[1rem]">Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                placeholder="name@company.com"
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                placeholder="••••••••"
                required
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => signInWithProvider("google")}>
              Login with Google
            </Button>
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => signInWithProvider("azure")}>
              Login with Microsoft
            </Button>
            <Button variant="outline" className="w-full" disabled={loading} onClick={() => signInWithProvider("github")}>
              Login with GitHub
            </Button>
            <div className="mt-4 text-center text-sm">
              Go back to the {""}
              <a className="underline underline-offset-4" href="https://pv-corr.app/">
                home
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
