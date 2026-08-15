import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem("recyclify_token");
    const storedUser = localStorage.getItem("recyclify_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("recyclify_token");
        localStorage.removeItem("recyclify_user");
      }
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("recyclify_token", newToken);
    localStorage.setItem("recyclify_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("recyclify_token");
    localStorage.removeItem("recyclify_user");
    setToken(null);
    setUser(null);
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
