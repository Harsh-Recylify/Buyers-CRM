import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useForgotPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import logo from "@assets/images_1782449948308.png";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({ email: z.string().email("Enter a valid email address") });

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const forgotPassword = useForgotPassword();

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  function onSubmit(data: { email: string }) {
    forgotPassword.mutate({ data }, {
      onSuccess: () => setSubmitted(true),
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Recyclify" className="h-12 mb-4" />
            {submitted ? (
              <>
                <CheckCircle className="h-12 w-12 text-[#118847] mb-3" />
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Check your email</h1>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  If an account exists with that email, we have sent password reset instructions.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Forgot password</h1>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Enter your email address and we will send you reset instructions.
                </p>
              </>
            )}
          </div>

          {!submitted && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-[#118847] hover:bg-[#0e7038]" disabled={forgotPassword.isPending}>
                  {forgotPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center text-sm text-[#118847] hover:text-[#0e7038] gap-1 font-medium">
              <ArrowLeft className="h-4 w-4" />Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
