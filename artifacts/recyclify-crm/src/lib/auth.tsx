import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Read localStorage synchronously on first render (not in an effect) so
// isAuthenticated is correct on the very first paint after a reload —
// otherwise ProtectedRoute sees isAuthenticated=false for one tick and
// redirects to /login before the session has a chance to restore.
function readStoredSession(): { token: string | null; user: User | null } {
  try {
    const storedToken = localStorage.getItem("recyclify_token");
    const storedUser = localStorage.getItem("recyclify_user");
    if (storedToken && storedUser) {
      return { token: storedToken, user: JSON.parse(storedUser) };
    }
  } catch (e) {
    localStorage.removeItem("recyclify_token");
    localStorage.removeItem("recyclify_user");
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ token, user }, setSession] = useState(readStoredSession);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("recyclify_token", newToken);
    localStorage.setItem("recyclify_user", JSON.stringify(newUser));
    setSession({ token: newToken, user: newUser });
  };

  const logout = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    localStorage.removeItem("recyclify_token");
    localStorage.removeItem("recyclify_user");
    setSession({ token: null, user: null });
    setLocation("/login");
  };

  // Auto sign-out after 30 minutes with no mouse/keyboard/scroll/touch
  // activity, so an unattended, still-logged-in session doesn't sit open
  // indefinitely. Runs only while actually logged in.
  useEffect(() => {
    if (!token) return;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        toast({ title: "Signed out due to inactivity", description: "You were logged out after 30 minutes without activity." });
        logout();
      }, IDLE_TIMEOUT_MS);
    };

    resetIdleTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
