import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useVerifyInvitation, useAcceptInvitation, getVerifyInvitationQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logo from "@assets/images_1782449948308.png";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const acceptSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
});

type AcceptFormValues = z.infer<typeof acceptSchema>;

function roleLabel(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function AcceptInvite() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const token = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") ?? "";
  }, []);

  const { data: invite, isLoading, isError } = useVerifyInvitation(
    { token },
    { query: { queryKey: getVerifyInvitationQueryKey({ token }), enabled: !!token, retry: false } }
  );

  const form = useForm<AcceptFormValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { name: "", password: "", phone: "" },
  });

  const acceptMutation = useAcceptInvitation();

  const onSubmit = (data: AcceptFormValues) => {
    acceptMutation.mutate(
      { data: { token, ...data } },
      {
        onSuccess: (res) => {
          login(res.token, res.user);
          toast({ title: "Welcome to Recyclify!", description: "Your account is ready." });
          setLocation("/dashboard");
        },
        onError: (err) => {
          toast({
            title: "Could not create account",
            description: err.message || "This invitation may have expired.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const invalid = !token || isError || (invite && !invite.valid);

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Recyclify Logo" className="h-12 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Join Recyclify</h1>
            <p className="text-sm text-gray-500 mt-2 text-center">Create your account to get started</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-sm">Verifying your invitation...</p>
            </div>
          ) : invalid ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="font-semibold text-gray-900">Invitation not valid</h2>
              <p className="text-sm text-muted-foreground mt-2">
                This invite link is invalid or has expired. Please ask your administrator to send a new one.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setLocation("/login")}>
                Go to Sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-lg bg-[#118847]/5 border border-[#118847]/15 p-3 mb-6">
                <CheckCircle2 className="h-5 w-5 text-[#118847] shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-gray-900">
                    You've been invited{invite?.invitedByName ? ` by ${invite.invitedByName}` : ""} to join as{" "}
                    <span className="font-semibold">{roleLabel(invite?.role ?? "team member")}</span>.
                  </p>
                  <p className="text-muted-foreground mt-0.5">{invite?.email}</p>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="+91..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Create Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Minimum 6 characters" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-11 bg-[#118847] hover:bg-[#0e7038]" disabled={acceptMutation.isPending}>
                    {acceptMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>
                    ) : (
                      "Create Account & Sign in"
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>

        <div className="border-t border-gray-100 p-6 bg-gray-50/50 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="font-semibold text-primary hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
