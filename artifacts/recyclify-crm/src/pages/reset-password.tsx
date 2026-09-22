import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useResetPassword } from "@workspace/api-client-react";
import { useSearchParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import logo from "@assets/images_1782449948308.png";
import { ArrowLeft, CheckCircle, Loader2, AlertCircle } from "lucide-react";

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [, setLocation] = useLocation();
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const resetPassword = useResetPassword();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(data: { password: string }) {
    resetPassword.mutate(
      { data: { token, password: data.password } },
      {
        onSuccess: () => {
          toast({ title: "Password reset", description: "You can now sign in with your new password." });
          setDone(true);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Recyclify" className="h-12 mb-4" />
            {!token ? (
              <>
                <AlertCircle className="h-12 w-12 text-destructive mb-3" />
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Invalid reset link</h1>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  This password reset link is missing its token. Request a new one below.
                </p>
              </>
            ) : done ? (
              <>
                <CheckCircle className="h-12 w-12 text-[#118847] mb-3" />
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Password reset</h1>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Your password has been changed successfully.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Set a new password</h1>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Choose a new password for your account.
                </p>
              </>
            )}
          </div>

          {token && !done && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-[#118847] hover:bg-[#0e7038]" disabled={resetPassword.isPending}>
                  {resetPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>
              </form>
            </Form>
          )}

          {done && (
            <Button className="w-full bg-[#118847] hover:bg-[#0e7038]" onClick={() => setLocation("/login")}>
              Back to Sign In
            </Button>
          )}

          {!token && (
            <div className="mt-2 text-center">
              <Link href="/forgot-password" className="inline-flex items-center text-sm text-[#118847] hover:text-[#0e7038] gap-1 font-medium">
                <ArrowLeft className="h-4 w-4" />Request a new link
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
