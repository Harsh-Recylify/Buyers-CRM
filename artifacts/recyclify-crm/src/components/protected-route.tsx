import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "@/lib/auth";
import { Loader2, AlertCircle } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export function ProtectedRoute({ component: Component, path }: { component: React.ComponentType<any>, path: string }) {
  const { isAuthenticated, logout } = useAuth();

  const { isLoading, isError, error, refetch, isFetching } = useGetMe({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetMeQueryKey(),
      // Retry transient/server failures (e.g. a DB hiccup) a couple of times
      // before giving up — a single blip shouldn't force a valid session out.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
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
    // Only an actual auth failure (expired/invalid token) should sign the
    // user out. Anything else (network blip, transient 500) is not a reason
    // to destroy a valid session — let the user retry instead.
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 || status === 403) {
      logout();
      return <Redirect to="/login" />;
    }

    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="font-medium">Couldn't reach the server</p>
          <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Retrying..." : "Retry"}
        </Button>
      </div>
    );
  }

  return <Route path={path} component={Component} />;
}
