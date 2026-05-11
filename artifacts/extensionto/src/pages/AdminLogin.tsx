import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, Shield, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect /admin to /settings
    if (location.pathname === "/admin") {
      navigate("/settings", { replace: true });
    }

    // Dev-bypass: skip Supabase checks when credentials are not configured
    if (!isSupabaseConfigured) return;

    // Check if already authenticated
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (role?.role === "admin") {
        navigate("/settings/manage", { replace: true });
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session) return;

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (role?.role === "admin") {
        navigate("/settings/manage", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const handleDevBypass = () => {
    navigate("/settings/manage");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      navigate("/settings/manage");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is admin
      let { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      // If no role yet, attempt to bootstrap the first admin (only works if no admin exists)
      if (!role?.role) {
        const { error: bootstrapError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "admin",
        });

        if (!bootstrapError) {
          const result = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .maybeSingle();
          role = result.data ?? null;
          roleError = result.error ?? null;
        }
      }

      if (roleError || role?.role !== "admin") {
        // Not an admin
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "You are not authorized to access the admin panel",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome Admin!",
        description: "Successfully logged in to the dashboard",
      });
      navigate("/settings/manage");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      navigate("/settings/manage");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        // If the user already exists, guide them to Sign In instead of failing silently
        if (error.code === "user_already_exists" || /already registered/i.test(error.message ?? "")) {
          setIsSignUp(false);
          toast({
            title: "الحساب موجود بالفعل",
            description: "هذا البريد مسجّل مسبقًا. قم بتسجيل الدخول بدلًا من إنشاء حساب جديد.",
          });
          return;
        }
        throw error;
      }

      if (!data.user) throw new Error("Sign up failed");

      // Try to assign admin role (will succeed only if no admin exists yet)
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "admin",
      });

      if (roleError) {
        toast({
          title: "تم إنشاء الحساب",
          description: "تم إنشاء حسابك، لكن تحتاج صلاحية مدير للدخول.",
        });
        await supabase.auth.signOut();
        return;
      }

      toast({
        title: "تم إنشاء حساب المدير",
        description: "تم تسجيل دخولك إلى لوحة التحكم.",
      });
      navigate("/settings/manage");
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast({
        title: "فشل إنشاء الحساب",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin Login"
        noindex
        canonicalPath="/settings"
      />
      <Navbar />

      <main className="container mx-auto flex min-h-[calc(100vh-80px)] items-center justify-center px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold">
                {isSignUp ? "Create Admin Account" : "Admin Login"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isSignUp
                  ? "First user becomes admin automatically"
                  : "Enter your credentials to access the dashboard"}
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
                <p className="mb-1 text-sm font-medium text-yellow-400">Dev Mode — No Auth Credentials</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  Set <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> and{" "}
                  <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> to enable real login.
                </p>
                <Button type="button" className="w-full" onClick={handleDevBypass}>
                  <Shield className="mr-2 h-4 w-4" />
                  Enter Admin Panel (Dev Mode)
                </Button>
              </div>
            )}

            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className={`space-y-6 ${!isSupabaseConfigured ? "opacity-40 pointer-events-none select-none" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isSignUp ? (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "First time? Create admin account"}
              </button>
              <p className="mt-4 text-xs text-muted-foreground">
                Protected area. Authorized access only.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLogin;
