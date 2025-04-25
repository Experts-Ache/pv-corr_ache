import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Theme } from "../../types/theme";
import { Language, setTranslations } from "../../types/language";
import { fetchTranslations } from "../../services/translations";
import LoginForm from "./LoginForm";
import AdminDashboard from "../admin/AdminDashboard";
import { Session } from "@supabase/supabase-js";
import { showToast } from "../../lib/toast";

interface AuthContextType {
  user: any;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  loginType: "user" | "admin" | null;
  viewMode: "user" | "admin";
  toggleViewMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signOut: async () => {},
  isAdmin: false,
  loginType: null,
  viewMode: "user",
  toggleViewMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
  currentTheme: Theme;
  currentLanguage: Language;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, currentTheme, currentLanguage }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loginType, setLoginType] = useState<"user" | "admin" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<"user" | "admin">("user");

  // Load translations when component mounts or language changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        setLoading(true);
        const translations = await fetchTranslations(currentLanguage);
        setTranslations(translations);
      } catch (err) {
        console.error("Error loading translations in AuthProvider:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTranslations();
  }, [currentLanguage]);

  const refreshSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) {
        throw error;
      }
      if (session) {
        handleSession(session);
      } else {
        // If no session after refresh, sign out
        await signOut();
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      await signOut();
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error);
        signOut();
        return;
      }
      if (session) {
        handleSession(session);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setIsAdmin(false);
        setViewMode("user");
        setLoginType(null);
      } else if (event === "TOKEN_REFRESHED") {
        if (session) {
          handleSession(session);
        }
      } else if (event === "USER_UPDATED") {
        if (session) {
          handleSession(session);
        }
      } else if (session?.user) {
        handleSession(session);
      }
    });

    // Set up session refresh interval
    const refreshInterval = setInterval(refreshSession, 3600000); // Refresh every hour

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const handleSession = (session: Session | null) => {
    if (session?.user) {
      const metadata = session.user.user_metadata || {};

      // Set user and admin status
      setUser(session.user);
      setIsAdmin(metadata.admin_level === "admin" || metadata.admin_level === "super_admin");

      // Dispatch settings event with complete metadata
      window.dispatchEvent(
        new CustomEvent("userSettingsLoaded", {
          detail: metadata,
        }),
      );

      // Apply theme from metadata
      const themeId = metadata.theme_id || "zinc";
      const split = themeId.split(".");
      document.documentElement.setAttribute("data-theme", split[0]);
      if (split[1]) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const signOut = async () => {
    try {
      // Clear any cached auth state before signing out
      localStorage.removeItem("sb-auth-token");
      sessionStorage.removeItem("sb-auth-token");

      await supabase.auth.signOut();
      setLoginType(null);
      setUser(null);
      setIsAdmin(false);
      setViewMode("user");

      // Force page reload to clear any cached state
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleViewMode = (showToasts = true) => {
    const newMode = viewMode === "user" ? "admin" : "user";
    setViewMode(newMode);

    if (showToasts) {
      showToast(`Switched to ${newMode === "user" ? "User" : "Admin"} view`, "success");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm currentTheme={currentTheme} onSuccess={(type) => setLoginType(type)} />;
  }

  // Show admin dashboard for admin users who logged in through admin login
  if (isAdmin && (loginType === "admin" || viewMode === "admin")) {
    return <AdminDashboard currentTheme={currentTheme} currentLanguage={currentLanguage} onSwitchToUserView={() => toggleViewMode(true)} />;
  }

  return <AuthContext.Provider value={{ user, signOut, isAdmin, loginType, viewMode, toggleViewMode }}>{children}</AuthContext.Provider>;
};
