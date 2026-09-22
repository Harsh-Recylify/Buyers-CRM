import React, { createContext, useContext, useState, ReactNode } from "react";
import { User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

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

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("recyclify_token", newToken);
    localStorage.setItem("recyclify_user", JSON.stringify(newUser));
    setSession({ token: newToken, user: newUser });
  };

  const logout = () => {
    localStorage.removeItem("recyclify_token");
    localStorage.removeItem("recyclify_user");
    setSession({ token: null, user: null });
    setLocation("/login");
  };

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
