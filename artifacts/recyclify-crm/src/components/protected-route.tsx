import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

export function ProtectedRoute({ component: Component, path }: { component: React.ComponentType<any>, path: string }) {
  const { isAuthenticated, logout } = useAuth();
  
  const { isLoading, isError } = useGetMe({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    logout();
    return <Redirect to="/login" />;
  }

  return <Route path={path} component={Component} />;
}
