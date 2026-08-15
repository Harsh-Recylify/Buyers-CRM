import React from "react";
import {
  useListUsers, useCreateUser, useDeleteUser,
  useListAuditLogs, useListLoginLogs, useGetAppSettings, useUpdateAppSettings,
  useListInvitations, useCreateInvitation, useRevokeInvitation, useResendInvitation,
  getListUsersQueryKey, getListAuditLogsQueryKey, getListLoginLogsQueryKey, getGetAppSettingsQueryKey,
  getListInvitationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ShieldAlert, Users, ClipboardList, LogIn, Settings, Save, Mail, Copy, Check, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";

const ROLES = ["super_admin", "admin", "manager", "team_member"];
const ROLE_RANK: Record<string, number> = { team_member: 1, manager: 2, admin: 3, super_admin: 4 };

function invitableRoles(currentRole: string): string[] {
  if (currentRole === "super_admin") return ROLES;
  const rank = ROLE_RANK[currentRole] ?? 0;
  return ROLES.filter(r => ROLE_RANK[r] < rank);
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-red-100 text-red-800 border-red-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  team_member: "bg-gray-100 text-gray-700 border-gray-200",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function UserDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: { name: "", email: "", password: "", role: "team_member", department: "" }
  });
  const createUser = useCreateUser();

  function onSubmit(data: any) {
    createUser.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "User created successfully" });
        setOpen(false);
        reset();
        onSuccess();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#118847] hover:bg-[#0e7038] gap-2">
          <Plus className="h-4 w-4" />Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input placeholder="Name" {...register("name", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="email@company.com" {...register("email", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" placeholder="Minimum 6 characters" {...register("password", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select defaultValue="team_member" onValueChange={v => setValue("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input placeholder="e.g. Sales, Operations" {...register("department")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038]" disabled={createUser.isPending}>
              {createUser.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettingsTab() {
  const { data: settings, isLoading } = useGetAppSettings({ query: { queryKey: getGetAppSettingsQueryKey() } });
  const updateSettings = useUpdateAppSettings();
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm();

  React.useEffect(() => {
    if (settings) reset(settings as any);
  }, [settings]);

  function onSubmit(data: any) {
    updateSettings.mutate({ data }, {
      onSuccess: () => toast({ title: "Settings saved" }),
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader><CardTitle className="text-base">Application Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>App Name</Label>
              <Input {...register("appName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Primary Color</Label>
              <Input {...register("primaryColor")} type="color" className="h-10 cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input {...register("timezone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input {...register("currency")} />
            </div>
          </div>
          <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038] gap-2" disabled={updateSettings.isPending}>
            <Save className="h-4 w-4" />{updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function InviteRow({ inv, onCopy, onRevoke, onResend, copiedId, busy }: any) {
  const isPending = inv.status === "pending";
  const isExpired = new Date(inv.expiresAt) < new Date();
  const effectiveStatus = isPending && isExpired ? "expired" : inv.status;

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    accepted: "bg-green-100 text-green-700 border-green-200",
    revoked: "bg-gray-100 text-gray-500 border-gray-200",
    expired: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{inv.email}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`capitalize text-xs ${ROLE_COLORS[inv.role] ?? ""}`}>
          {inv.role.replace(/_/g, " ")}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`capitalize text-xs ${statusStyles[effectiveStatus] ?? ""}`}>
          {effectiveStatus}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">{inv.invitedByName ?? "—"}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {(effectiveStatus === "pending") && (
            <Button
              variant="outline" size="sm"
              onClick={() => onCopy(inv)}
              className="gap-1.5 h-8 text-xs"
            >
              {copiedId === inv.id ? <><Check className="h-3.5 w-3.5 text-green-600" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy link</>}
            </Button>
          )}
          {(effectiveStatus === "expired" || effectiveStatus === "revoked") && (
            <Button
              variant="outline" size="sm"
              onClick={() => onResend(inv)}
              disabled={busy}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />New link
            </Button>
          )}
          {effectiveStatus !== "accepted" && (
            <Button
              variant="ghost" size="sm"
              onClick={() => onRevoke(inv)}
              disabled={busy}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              title="Revoke"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function InviteDialog({ onCreated }: { onCreated: (inv: any) => void }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const roleOptions = invitableRoles(user?.role ?? "");
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { email: "", role: roleOptions[roleOptions.length - 1] ?? "team_member", department: "" },
  });
  const createInvite = useCreateInvitation();

  function onSubmit(data: any) {
    createInvite.mutate({ data }, {
      onSuccess: (inv) => {
        setOpen(false);
        reset();
        onCreated(inv);
      },
      onError: (e: any) => toast({ title: "Could not create invite", description: e.message, variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#118847] hover:bg-[#0e7038] gap-2">
          <Send className="h-4 w-4" />Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a Team Member</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Generate a secure invite link. Share it with your teammate — they'll set their own password and join instantly.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input type="email" placeholder="teammate@recyclify.in" {...register("email", { required: true })} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={watch("role")} onValueChange={v => setValue("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roleOptions.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Department <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g. Sales, Operations" {...register("department")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038]" disabled={createInvite.isPending}>
              {createInvite.isPending ? "Creating..." : "Create Invite Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvitesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = React.useState<number | null>(null);
  const [shareInvite, setShareInvite] = React.useState<any>(null);

  const { data, isLoading } = useListInvitations({}, { query: { queryKey: getListInvitationsQueryKey({}) } });
  const invites = (data?.data ?? []) as any[];

  const revokeInvite = useRevokeInvitation();
  const resendInvite = useResendInvitation();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListInvitationsQueryKey() });
  }

  async function copyLink(inv: any) {
    try {
      await navigator.clipboard.writeText(inv.inviteUrl);
      setCopiedId(inv.id);
      toast({ title: "Invite link copied", description: "Paste it into an email or message to your teammate." });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setShareInvite(inv);
    }
  }

  function handleRevoke(inv: any) {
    revokeInvite.mutate({ id: inv.id }, {
      onSuccess: () => { toast({ title: "Invitation revoked" }); refresh(); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function handleResend(inv: any) {
    resendInvite.mutate({ id: inv.id }, {
      onSuccess: (fresh) => { setShareInvite(fresh); refresh(); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function onCreated(inv: any) {
    refresh();
    setShareInvite(inv);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Team Invitations</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Invite teammates by email. They click the link, set a password, and start working.
          </p>
        </div>
        <InviteDialog onCreated={onCreated} />
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array(3).fill(0).map((_, i) => (
              <TableRow key={i}>
                {Array(5).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}
              </TableRow>
            )) : invites.map((inv) => (
              <InviteRow
                key={inv.id}
                inv={inv}
                onCopy={copyLink}
                onRevoke={handleRevoke}
                onResend={handleResend}
                copiedId={copiedId}
                busy={revokeInvite.isPending || resendInvite.isPending}
              />
            ))}
            {!isLoading && invites.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No invitations yet.</p>
                  <p className="text-xs">Click "Invite Team Member" to create your first invite link.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Share link dialog */}
      <Dialog open={!!shareInvite} onOpenChange={v => { if (!v) setShareInvite(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite link ready</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Share this link with <span className="font-medium text-gray-900">{shareInvite?.email}</span>. It expires in 7 days.
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={shareInvite?.inviteUrl ?? ""} className="text-xs" onFocus={e => e.target.select()} />
            <Button
              className="bg-[#118847] hover:bg-[#0e7038] gap-1.5 shrink-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareInvite.inviteUrl);
                  toast({ title: "Copied to clipboard" });
                } catch {
                  toast({ title: "Select the link and copy manually", variant: "destructive" });
                }
              }}
            >
              <Copy className="h-4 w-4" />Copy
            </Button>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
            Tip: paste this link into an email, WhatsApp, or any chat. When they open it, they'll create their account and be signed in automatically.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareInvite(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersData, isLoading: usersLoading } = useListUsers({}, { query: { queryKey: getListUsersQueryKey({}) } });
  const { data: auditData, isLoading: auditLoading } = useListAuditLogs({}, { query: { queryKey: getListAuditLogsQueryKey({}) } });
  const { data: loginData, isLoading: loginLoading } = useListLoginLogs({}, { query: { queryKey: getListLoginLogsQueryKey({}) } });

  const users = (usersData as any)?.data ?? [];
  const auditLogs = (auditData as any)?.data ?? [];
  const loginLogs = (loginData as any)?.data ?? [];

  const deleteUserMutation = useDeleteUser();

  function handleDeleteUser(id: number, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    deleteUserMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "User deleted" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({}) });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  if (!["super_admin", "admin"].includes(user?.role ?? "")) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">Manage users, review audit logs, and configure system settings.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-gray-100/80">
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="invites" className="gap-2"><Mail className="h-4 w-4" />Invites</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><ClipboardList className="h-4 w-4" />Audit Logs</TabsTrigger>
          <TabsTrigger value="logins" className="gap-2"><LogIn className="h-4 w-4" />Login Logs</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">All Users ({(usersData as any)?.meta?.total ?? 0})</CardTitle>
              <UserDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey({}) })} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? Array(4).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      {Array(6).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}
                    </TableRow>
                  )) : users.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${ROLE_COLORS[u.role] ?? ""}`}>
                          {u.role.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.department ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={u.status === "active" ? "default" : "secondary"} className={u.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : ""}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!usersLoading && users.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <InvitesTab />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit Trail ({(auditData as any)?.meta?.total ?? 0} entries)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLoading ? Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>{Array(5).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
                  )) : auditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.userName ?? "System"}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize text-xs">{log.action}</Badge></TableCell>
                      <TableCell className="text-muted-foreground capitalize">{log.entityType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-64 truncate">{log.description}</TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{timeAgo(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {!auditLoading && auditLogs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No audit logs found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Login History ({(loginData as any)?.meta?.total ?? 0} entries)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginLoading ? Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>{Array(5).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>
                  )) : loginLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.userName ?? "Unknown"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{log.userEmail ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">{log.ipAddress ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={log.status === "success" ? "text-green-700 border-green-200" : "text-red-700 border-red-200"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{timeAgo(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {!loginLoading && loginLogs.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No login logs found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
