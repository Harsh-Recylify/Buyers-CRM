import React from "react";
import { useGetMe, useUpdateProfile, useChangePassword, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { User, Shield, Save } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Settings() {
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: me, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const profileForm = useForm({ defaultValues: { name: "", phone: "", department: "" } });
  const passwordForm = useForm({ defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  React.useEffect(() => {
    if (me) {
      profileForm.reset({
        name: me.name ?? "",
        phone: (me as any).phone ?? "",
        department: (me as any).department ?? "",
      });
    }
  }, [me]);

  function onProfileSubmit(data: any) {
    updateProfile.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Profile updated" });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function onPasswordSubmit(data: any) {
    if (data.newPassword !== data.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    changePassword.mutate({ data: { currentPassword: data.currentPassword, newPassword: data.newPassword } }, {
      onSuccess: () => {
        toast({ title: "Password changed" });
        passwordForm.reset();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  const initials = (me?.name ?? authUser?.name ?? "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account details and security preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-gray-100/80">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl bg-[#118847]/10 text-[#118847]">{initials}</AvatarFallback>
                </Avatar>
                {isLoading ? (
                  <>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-semibold text-lg">{me?.name}</p>
                      <p className="text-sm text-muted-foreground">{me?.email}</p>
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#118847]/10 text-[#118847] capitalize">
                      {(me as any)?.role?.replace(/_/g, " ")}
                    </span>
                    {(me as any)?.department && (
                      <p className="text-sm text-muted-foreground">{(me as any).department}</p>
                    )}
                    {(me as any)?.lastLogin && (
                      <p className="text-xs text-muted-foreground">
                        Last login: {new Date((me as any).lastLogin).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Edit Profile</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                  </div>
                ) : (
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input {...profileForm.register("name")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone Number</Label>
                      <Input {...profileForm.register("phone")} placeholder="+91 00000 00000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department</Label>
                      <Input {...profileForm.register("department")} placeholder="e.g. Sales, Operations" />
                    </div>
                    <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038] gap-2" disabled={updateProfile.isPending}>
                      <Save className="h-4 w-4" />{updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>Choose a strong password with at least 6 characters.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <Input type="password" {...passwordForm.register("currentPassword", { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input type="password" {...passwordForm.register("newPassword", { required: true, minLength: 6 })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input type="password" {...passwordForm.register("confirmPassword", { required: true })} />
                </div>
                <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038] gap-2 w-full" disabled={changePassword.isPending}>
                  <Shield className="h-4 w-4" />{changePassword.isPending ? "Updating..." : "Change Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
