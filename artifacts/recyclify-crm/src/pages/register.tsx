import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister } from "@workspace/api-client-react";
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
import { Loader2 } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().default("team_member"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "team_member",
    },
  });

  const registerMutation = useRegister();

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({
            title: "Registration submitted",
            description: "Please check your email to verify your account.",
          });
          setLocation("/login");
        },
        onError: (err) => {
          toast({
            title: "Registration failed",
            description: err.message || "An error occurred during registration.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Recyclify Logo" className="h-12 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Request Access</h1>
            <p className="text-sm text-gray-500 mt-2">Create an account to access the Bidder Market</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@recyclify.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11" 
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Request Access"
                )}
              </Button>
            </form>
          </Form>
        </div>
        
        <div className="border-t border-gray-100 p-6 bg-gray-50/50 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
