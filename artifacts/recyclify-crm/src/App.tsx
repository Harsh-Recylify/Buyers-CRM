import React from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Login from "@/pages/login";
import AcceptInvite from "@/pages/accept-invite";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import CompanyDetail from "@/pages/company-detail";
import Pipeline from "@/pages/pipeline";
import Buyers from "@/pages/buyers";
import BuyerDetail from "@/pages/buyer-detail";
import Bids from "@/pages/bids";
import BidDetail from "@/pages/bid-detail";
import Tasks from "@/pages/tasks";
import Calendar from "@/pages/calendar";
import Activities from "@/pages/activities";
import Reports from "@/pages/reports";
import Notifications from "@/pages/notifications";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import Profile from "@/pages/profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register"><Redirect to="/login" /></Route>
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      <ProtectedRoute path="/dashboard" component={() => <Layout><Dashboard /></Layout>} />
      <ProtectedRoute path="/companies/:id" component={() => <Layout><CompanyDetail /></Layout>} />
      <ProtectedRoute path="/companies" component={() => <Layout><Companies /></Layout>} />
      <ProtectedRoute path="/pipeline" component={() => <Layout><Pipeline /></Layout>} />
      <ProtectedRoute path="/buyers/:id" component={() => <Layout><BuyerDetail /></Layout>} />
      <ProtectedRoute path="/buyers" component={() => <Layout><Buyers /></Layout>} />
      <ProtectedRoute path="/bids/:id" component={() => <Layout><BidDetail /></Layout>} />
      <ProtectedRoute path="/bids" component={() => <Layout><Bids /></Layout>} />
      <ProtectedRoute path="/tasks" component={() => <Layout><Tasks /></Layout>} />
      <ProtectedRoute path="/calendar" component={() => <Layout><Calendar /></Layout>} />
      <ProtectedRoute path="/activities" component={() => <Layout><Activities /></Layout>} />
      <ProtectedRoute path="/reports" component={() => <Layout><Reports /></Layout>} />
      <ProtectedRoute path="/notifications" component={() => <Layout><Notifications /></Layout>} />
      <ProtectedRoute path="/admin" component={() => <Layout><Admin /></Layout>} />
      <ProtectedRoute path="/settings" component={() => <Layout><Settings /></Layout>} />
      <ProtectedRoute path="/profile" component={() => <Layout><Profile /></Layout>} />

      <Route path="/" component={Landing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
