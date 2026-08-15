import React from "react";
import {
  useListCompanies, getListCompaniesQueryKey,
  useCreateCompany, useUpdateCompany, useDeleteCompany,
  useListUsers, getListUsersQueryKey,
  getGetPipelineQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Filter, MoreHorizontal, ArrowRight, Building2 } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const PIPELINE_STAGES = [
  "New Lead", "Contacted", "Meeting Scheduled", "Site Inspection",
  "Quotation Sent", "Bid Open", "Negotiation", "Approved",
  "Pickup Scheduled", "Material Collected", "Completed", "Won", "Lost",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];
const INDUSTRIES = ["IT", "Manufacturing", "Healthcare", "Education", "Finance", "Retail", "Government", "Other"];
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Chandigarh","Other",
];

type CompanyFormData = {
  name: string;
  industry: string;
  website: string;
  gst: string;
  pan: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  leadSource: string;
  ownerId: string;
  stage: string;
  priority: string;
  expectedScrapWeight: string;
  expectedRevenue: string;
  expectedPickupDate: string;
  notes: string;
};

const emptyForm = (): CompanyFormData => ({
  name: "", industry: "", website: "", gst: "", pan: "",
  address: "", state: "", city: "", pincode: "", leadSource: "",
  ownerId: "", stage: "New Lead", priority: "medium",
  expectedScrapWeight: "", expectedRevenue: "", expectedPickupDate: "", notes: "",
});

export default function Companies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<CompanyFormData>(emptyForm());
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useListCompanies(
    { search, page, limit: 20 },
    { query: { queryKey: getListCompaniesQueryKey({ search, page, limit: 20 }) } }
  );

  const { data: usersData } = useListUsers(
    {},
    { query: { queryKey: getListUsersQueryKey({}) } }
  );
  const users = usersData?.data ?? [];

  const createCompany = useCreateCompany({
    mutation: {
      onSuccess: () => {
        toast({ title: "Company created successfully" });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey() });
        closeModal();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const updateCompany = useUpdateCompany({
    mutation: {
      onSuccess: () => {
        toast({ title: "Company updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        closeModal();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const deleteCompany = useDeleteCompany({
    mutation: {
      onSuccess: () => {
        toast({ title: "Company deleted" });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey() });
        setDeletingId(null);
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const openEdit = (company: any) => {
    setEditingId(company.id);
    setForm({
      name: company.name || "",
      industry: company.industry || "",
      website: company.website || "",
      gst: company.gst || "",
      pan: company.pan || "",
      address: company.address || "",
      state: company.state || "",
      city: company.city || "",
      pincode: company.pincode || "",
      leadSource: company.leadSource || "",
      ownerId: company.ownerId ? String(company.ownerId) : "",
      stage: company.stage || "New Lead",
      priority: company.priority || "medium",
      expectedScrapWeight: company.expectedScrapWeight ? String(company.expectedScrapWeight) : "",
      expectedRevenue: company.expectedRevenue ? String(company.expectedRevenue) : "",
      expectedPickupDate: company.expectedPickupDate ? company.expectedPickupDate.substring(0, 10) : "",
      notes: company.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      ...(form.industry && { industry: form.industry }),
      ...(form.website && { website: form.website }),
      ...(form.gst && { gst: form.gst }),
      ...(form.pan && { pan: form.pan }),
      ...(form.address && { address: form.address }),
      ...(form.state && { state: form.state }),
      ...(form.city && { city: form.city }),
      ...(form.pincode && { pincode: form.pincode }),
      ...(form.leadSource && { leadSource: form.leadSource }),
      ...(form.ownerId && { ownerId: parseInt(form.ownerId) }),
      stage: form.stage,
      priority: form.priority,
      ...(form.expectedScrapWeight && { expectedScrapWeight: parseFloat(form.expectedScrapWeight) }),
      ...(form.expectedRevenue && { expectedRevenue: parseFloat(form.expectedRevenue) }),
      ...(form.expectedPickupDate && { expectedPickupDate: form.expectedPickupDate }),
      ...(form.notes && { notes: form.notes }),
    };
    if (editingId) {
      updateCompany.mutate({ id: editingId, data: payload });
    } else {
      createCompany.mutate({ data: payload });
    }
  };

  const set = (field: keyof CompanyFormData) => (v: string) => setForm((f) => ({ ...f, [field]: v }));
  const setInput = (field: keyof CompanyFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high": case "urgent": return "bg-red-100 text-red-700 hover:bg-red-100";
      case "medium": return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      case "low": return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      default: return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
  };

  const getStageColor = (stage: string) => {
    if (stage?.includes("Won") || stage?.includes("Completed")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (stage?.includes("Lost")) return "bg-gray-100 text-gray-600 border-gray-200";
    if (stage?.includes("Negotiation") || stage?.includes("Bid Open")) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-purple-100 text-purple-800 border-purple-200";
  };

  const isPending = createCompany.isPending || updateCompany.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage corporate clients and their IT asset lifecycle.</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => { setEditingId(null); setForm(emptyForm()); setShowModal(true); }}>
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50 rounded-t-xl">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies by name, industry..."
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto gap-2 bg-white">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/30 hover:bg-gray-50/30">
                <TableHead className="w-[300px]">Company</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Expected Revenue</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Building2 className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900">No companies found</p>
                      <p className="text-sm">Click "Add Company" to create your first company.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((company) => (
                  <TableRow key={company.id} className="group cursor-pointer">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                          {company.name}
                        </span>
                        {company.industry && (
                          <span className="text-xs text-muted-foreground">{company.industry}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-medium ${getStageColor(company.stage)}`}>
                        {company.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getPriorityColor(company.priority)} border-transparent`}>
                        {company.priority.charAt(0).toUpperCase() + company.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {company.expectedRevenue ? `₹${company.expectedRevenue.toLocaleString("en-IN")}` : "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {company.ownerName || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/companies/${company.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8">
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/companies/${company.id}`} className="cursor-pointer">View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(company)}>Edit Company</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingId(company.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data && data.meta && data.meta.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground bg-gray-50/50 rounded-b-xl">
            <div>
              Showing <span className="font-medium text-gray-900">{(data.meta.page - 1) * data.meta.limit + 1}</span> to{" "}
              <span className="font-medium text-gray-900">{Math.min(data.meta.page * data.meta.limit, data.meta.total)}</span> of{" "}
              <span className="font-medium text-gray-900">{data.meta.total}</span> companies
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={data.meta.page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={data.meta.page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Company Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" placeholder="Acme Corp Pvt. Ltd." value={form.name} onChange={setInput("name")} required />
              </div>

              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={set("industry")}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://example.com" value={form.website} onChange={setInput("website")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gst">GST Number</Label>
                <Input id="gst" placeholder="22AAAAA0000A1Z5" value={form.gst} onChange={setInput("gst")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pan">PAN Number</Label>
                <Input id="pan" placeholder="AAAAA0000A" value={form.pan} onChange={setInput("pan")} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main Street" value={form.address} onChange={setInput("address")} />
              </div>

              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={form.state} onValueChange={set("state")}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Mumbai" value={form.city} onChange={setInput("city")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" placeholder="400001" value={form.pincode} onChange={setInput("pincode")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="leadSource">Lead Source</Label>
                <Input id="leadSource" placeholder="Referral / Website / Cold Call" value={form.leadSource} onChange={setInput("leadSource")} />
              </div>

              <div className="space-y-1.5">
                <Label>Pipeline Stage</Label>
                <Select value={form.stage} onValueChange={set("stage")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={set("priority")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Assigned Team Member</Label>
                <Select value={form.ownerId} onValueChange={set("ownerId")}>
                  <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expectedRevenue">Estimated Project Value (₹)</Label>
                <Input id="expectedRevenue" type="number" placeholder="500000" value={form.expectedRevenue} onChange={setInput("expectedRevenue")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expectedScrapWeight">Expected Material Qty (kg)</Label>
                <Input id="expectedScrapWeight" type="number" placeholder="1000" value={form.expectedScrapWeight} onChange={setInput("expectedScrapWeight")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expectedPickupDate">Expected Pickup Date</Label>
                <Input id="expectedPickupDate" type="date" value={form.expectedPickupDate} onChange={setInput("expectedPickupDate")} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Additional notes about this company..." value={form.notes} onChange={setInput("notes")} rows={3} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : editingId ? "Update Company" : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the company. All associated data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingId && deleteCompany.mutate({ id: deletingId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
