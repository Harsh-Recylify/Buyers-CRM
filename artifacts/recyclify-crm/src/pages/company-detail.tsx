import React from "react";
import { useParams, Link } from "wouter";
import {
  useGetCompany, useListActivities, useListNotes, useListTasks,
  useListContacts, useUpdateCompanyStage, useUpdateCompany,
  useCreateNote, useCreateTask, useListUsers,
  getGetCompanyQueryKey, getListActivitiesQueryKey, getListNotesQueryKey,
  getListTasksQueryKey, getListContactsQueryKey, getListUsersQueryKey,
  getListCompaniesQueryKey,
  useListCompanyBids, useCreateCompanyBid, useUpdateCompanyBid, useDeleteCompanyBid,
  getListCompanyBidsQueryKey,
  type CompanyBid,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Building2, MapPin, Globe, Tag, Calendar, CheckSquare,
  Activity, Users, Plus, Pencil, Trash2, Trophy, TrendingDown, Gavel,
} from "lucide-react";

const STAGES = [
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

type CompanyEditForm = {
  name: string; industry: string; website: string; gst: string; pan: string;
  address: string; state: string; city: string; pincode: string; leadSource: string;
  ownerId: string; stage: string; priority: string;
  expectedScrapWeight: string; expectedRevenue: string; expectedPickupDate: string; notes: string;
};

const STAGE_COLORS: Record<string, string> = {
  "Won": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Lost": "bg-gray-100 text-gray-600 border-gray-200",
  "Negotiation": "bg-blue-100 text-blue-800 border-blue-200",
  "Bid Open": "bg-purple-100 text-purple-800 border-purple-200",
  "Approved": "bg-green-100 text-green-800 border-green-200",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtInr(v: number) {
  return "₹" + v.toLocaleString("en-IN");
}

const EMPTY_FORM = {
  buyerCompany: "",
  contactPerson: "",
  mobile: "",
  email: "",
  bidAmount: "",
  location: "",
  pickupTimeline: "",
  paymentTerms: "",
  remarks: "",
};

type BidFormData = typeof EMPTY_FORM;

function BidFormModal({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  isPending,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: BidFormData) => void;
  initialValues?: Partial<BidFormData>;
  isPending: boolean;
  title: string;
}) {
  const [form, setForm] = React.useState<BidFormData>({ ...EMPTY_FORM, ...initialValues });

  React.useEffect(() => {
    if (open) setForm({ ...EMPTY_FORM, ...initialValues });
  }, [open]);

  function field(key: keyof BidFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Buyer Company <span className="text-red-500">*</span></Label>
              <Input value={form.buyerCompany} onChange={field("buyerCompany")} placeholder="e.g. Recykal Technologies" required />
            </div>
            <div className="space-y-1">
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={field("contactPerson")} placeholder="Name" />
            </div>
            <div className="space-y-1">
              <Label>Mobile</Label>
              <Input value={form.mobile} onChange={field("mobile")} placeholder="+91 98765 43210" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={field("email")} placeholder="buyer@company.com" />
            </div>
            <div className="space-y-1">
              <Label>Bid Amount (₹) <span className="text-red-500">*</span></Label>
              <Input type="number" min="0" step="0.01" value={form.bidAmount} onChange={field("bidAmount")} placeholder="0" required />
            </div>
            <div className="space-y-1">
              <Label>Location</Label>
              <Input value={form.location} onChange={field("location")} placeholder="City / State" />
            </div>
            <div className="space-y-1">
              <Label>Pickup Timeline</Label>
              <Input value={form.pickupTimeline} onChange={field("pickupTimeline")} placeholder="e.g. Within 7 days" />
            </div>
            <div className="space-y-1">
              <Label>Payment Terms</Label>
              <Input value={form.paymentTerms} onChange={field("paymentTerms")} placeholder="e.g. Net 30, Advance" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={field("remarks")} placeholder="Any additional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038]" disabled={isPending}>
              {isPending ? "Saving..." : "Save Bid"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BidComparisonSection({ companyId }: { companyId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const bidsKey = getListCompanyBidsQueryKey(companyId);

  const { data: bidsData, isLoading } = useListCompanyBids(companyId, {
    query: { enabled: !!companyId, queryKey: bidsKey },
  });
  const createBid = useCreateCompanyBid();
  const updateBid = useUpdateCompanyBid();
  const deleteBid = useDeleteCompanyBid();

  const [addOpen, setAddOpen] = React.useState(false);
  const [editBid, setEditBid] = React.useState<CompanyBid | null>(null);

  const bids = bidsData?.data ?? [];
  const amounts = bids.map(b => b.bidAmount);
  const maxAmount = amounts.length ? Math.max(...amounts) : null;
  const minAmount = amounts.length > 1 ? Math.min(...amounts) : null;
  const avgAmount = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : null;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: bidsKey });
  }

  function handleCreate(form: BidFormData) {
    createBid.mutate(
      { companyId, data: { buyerCompany: form.buyerCompany, bidAmount: Number(form.bidAmount), contactPerson: form.contactPerson || undefined, mobile: form.mobile || undefined, email: form.email || undefined, location: form.location || undefined, pickupTimeline: form.pickupTimeline || undefined, paymentTerms: form.paymentTerms || undefined, remarks: form.remarks || undefined } },
      {
        onSuccess: () => { toast({ title: "Bid added" }); setAddOpen(false); invalidate(); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  }

  function handleUpdate(form: BidFormData) {
    if (!editBid) return;
    updateBid.mutate(
      { id: editBid.id, data: { buyerCompany: form.buyerCompany, bidAmount: Number(form.bidAmount), contactPerson: form.contactPerson || undefined, mobile: form.mobile || undefined, email: form.email || undefined, location: form.location || undefined, pickupTimeline: form.pickupTimeline || undefined, paymentTerms: form.paymentTerms || undefined, remarks: form.remarks || undefined } },
      {
        onSuccess: () => { toast({ title: "Bid updated" }); setEditBid(null); invalidate(); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  }

  function handleDelete(bid: CompanyBid) {
    if (!confirm(`Delete bid from ${bid.buyerCompany}?`)) return;
    deleteBid.mutate(
      { id: bid.id },
      {
        onSuccess: () => { toast({ title: "Bid deleted" }); invalidate(); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {bids.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Highest Bid</p>
              <p className="text-lg font-bold text-green-700">{maxAmount !== null ? fmtInr(maxAmount) : "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Avg Bid</p>
              <p className="text-lg font-bold">{avgAmount !== null ? fmtInr(Math.round(avgAmount)) : "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Lowest Bid</p>
              <p className="text-lg font-bold text-red-700">{minAmount !== null ? fmtInr(minAmount) : bids.length === 1 ? fmtInr(bids[0].bidAmount) : "—"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {bids.length} Bid{bids.length !== 1 ? "s" : ""} Received
        </h3>
        <Button size="sm" className="bg-[#118847] hover:bg-[#0e7038] gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Bid
        </Button>
      </div>

      {/* Bids list */}
      {bids.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Gavel className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No bids received yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add the first bid to start comparing offers</p>
            <Button size="sm" className="mt-4 bg-[#118847] hover:bg-[#0e7038] gap-1" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add First Bid
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bids.map((bid, idx) => {
            const isHighest = maxAmount !== null && bid.bidAmount === maxAmount;
            const isLowest = minAmount !== null && bid.bidAmount === minAmount;
            return (
              <Card
                key={bid.id}
                className={
                  isHighest
                    ? "border-green-300 bg-green-50/40 shadow-sm"
                    : isLowest
                    ? "border-red-200 bg-red-50/30"
                    : "bg-white"
                }
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${isHighest ? "bg-green-100 text-green-700" : isLowest ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm">{bid.buyerCompany}</span>
                          {isHighest && (
                            <Badge className="bg-green-100 text-green-700 border-green-300 gap-1 text-xs">
                              <Trophy className="h-3 w-3" /> Highest
                            </Badge>
                          )}
                          {isLowest && bids.length > 1 && (
                            <Badge className="bg-red-100 text-red-600 border-red-200 gap-1 text-xs">
                              <TrendingDown className="h-3 w-3" /> Lowest
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {bid.contactPerson && (
                            <span><span className="font-medium text-foreground/70">Contact:</span> {bid.contactPerson}</span>
                          )}
                          {bid.mobile && (
                            <span><span className="font-medium text-foreground/70">Mobile:</span> {bid.mobile}</span>
                          )}
                          {bid.email && (
                            <span><span className="font-medium text-foreground/70">Email:</span> {bid.email}</span>
                          )}
                          {bid.location && (
                            <span><span className="font-medium text-foreground/70">Location:</span> {bid.location}</span>
                          )}
                          {bid.pickupTimeline && (
                            <span><span className="font-medium text-foreground/70">Pickup:</span> {bid.pickupTimeline}</span>
                          )}
                          {bid.paymentTerms && (
                            <span><span className="font-medium text-foreground/70">Payment:</span> {bid.paymentTerms}</span>
                          )}
                        </div>

                        {bid.remarks && (
                          <p className="mt-1.5 text-xs text-muted-foreground italic">{bid.remarks}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xl font-bold ${isHighest ? "text-green-700" : isLowest && bids.length > 1 ? "text-red-600" : "text-foreground"}`}>
                        {fmtInr(bid.bidAmount)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditBid(bid)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => handleDelete(bid)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <BidFormModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={handleCreate}
        isPending={createBid.isPending}
        title="Add Bid"
      />

      {/* Edit modal */}
      <BidFormModal
        open={!!editBid}
        onOpenChange={v => { if (!v) setEditBid(null); }}
        onSubmit={handleUpdate}
        initialValues={editBid ? {
          buyerCompany: editBid.buyerCompany,
          contactPerson: editBid.contactPerson ?? "",
          mobile: editBid.mobile ?? "",
          email: editBid.email ?? "",
          bidAmount: String(editBid.bidAmount),
          location: editBid.location ?? "",
          pickupTimeline: editBid.pickupTimeline ?? "",
          paymentTerms: editBid.paymentTerms ?? "",
          remarks: editBid.remarks ?? "",
        } : undefined}
        isPending={updateBid.isPending}
        title="Edit Bid"
      />
    </div>
  );
}

export default function CompanyDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: company, isLoading } = useGetCompany(id, {
    query: { enabled: !!id && !isNaN(id), queryKey: getGetCompanyQueryKey(id) }
  });

  const { data: activitiesData } = useListActivities(
    { entityType: "company", entityId: id },
    { query: { enabled: !!id, queryKey: getListActivitiesQueryKey({ entityType: "company", entityId: id }) } }
  );

  const { data: notesData } = useListNotes(
    { entityType: "company", entityId: id },
    { query: { enabled: !!id, queryKey: getListNotesQueryKey({ entityType: "company", entityId: id }) } }
  );

  const { data: tasksData } = useListTasks(
    { entityType: "company", entityId: id },
    { query: { enabled: !!id, queryKey: getListTasksQueryKey({ entityType: "company", entityId: id }) } }
  );

  const { data: contacts } = useListContacts(id, {
    query: { enabled: !!id, queryKey: getListContactsQueryKey(id) }
  });

  const updateStage = useUpdateCompanyStage();
  const updateCompany = useUpdateCompany();
  const createNote = useCreateNote();
  const createTask = useCreateTask();

  const { data: usersData } = useListUsers({}, { query: { queryKey: getListUsersQueryKey({}) } });
  const users = usersData?.data ?? [];

  const [noteContent, setNoteContent] = React.useState("");
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskPriority, setTaskPriority] = React.useState("medium");
  const [editOpen, setEditOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState<CompanyEditForm>({
    name: "", industry: "", website: "", gst: "", pan: "", address: "",
    state: "", city: "", pincode: "", leadSource: "", ownerId: "", stage: "New Lead",
    priority: "medium", expectedScrapWeight: "", expectedRevenue: "", expectedPickupDate: "", notes: "",
  });

  function openEdit() {
    const c = company as any;
    setEditForm({
      name: c.name ?? "",
      industry: c.industry ?? "",
      website: c.website ?? "",
      gst: c.gst ?? "",
      pan: c.pan ?? "",
      address: c.address ?? "",
      state: c.state ?? "",
      city: c.city ?? "",
      pincode: c.pincode ?? "",
      leadSource: c.leadSource ?? "",
      ownerId: c.ownerId ? String(c.ownerId) : "",
      stage: c.stage ?? "New Lead",
      priority: c.priority ?? "medium",
      expectedScrapWeight: c.expectedScrapWeight != null ? String(c.expectedScrapWeight) : "",
      expectedRevenue: c.expectedRevenue != null ? String(c.expectedRevenue) : "",
      expectedPickupDate: c.expectedPickupDate ? c.expectedPickupDate.substring(0, 10) : "",
      notes: c.notes ?? "",
    });
    setEditOpen(true);
  }

  function setEF(key: keyof CompanyEditForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setEditForm(f => ({ ...f, [key]: e.target.value }));
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    const payload: Record<string, any> = {
      name: editForm.name.trim(),
      industry: editForm.industry || null,
      website: editForm.website || null,
      gst: editForm.gst || null,
      pan: editForm.pan || null,
      address: editForm.address || null,
      state: editForm.state || null,
      city: editForm.city || null,
      pincode: editForm.pincode || null,
      leadSource: editForm.leadSource || null,
      ownerId: editForm.ownerId ? parseInt(editForm.ownerId) : null,
      stage: editForm.stage,
      priority: editForm.priority,
      expectedScrapWeight: editForm.expectedScrapWeight ? parseFloat(editForm.expectedScrapWeight) : null,
      expectedRevenue: editForm.expectedRevenue ? parseFloat(editForm.expectedRevenue) : null,
      expectedPickupDate: editForm.expectedPickupDate || null,
      notes: editForm.notes || null,
    };
    updateCompany.mutate({ id, data: payload }, {
      onSuccess: () => {
        toast({ title: "Company updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        setEditOpen(false);
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function handleStageChange(stage: string) {
    updateStage.mutate({ id, data: { stage } }, {
      onSuccess: () => {
        toast({ title: "Stage updated" });
        queryClient.invalidateQueries({ queryKey: getGetCompanyQueryKey(id) });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function handleAddNote() {
    if (!noteContent.trim()) return;
    createNote.mutate({ data: { entityType: "company", entityId: id, content: noteContent } }, {
      onSuccess: () => {
        setNoteContent("");
        toast({ title: "Note added" });
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey({ entityType: "company", entityId: id }) });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function handleAddTask() {
    if (!taskTitle.trim()) return;
    createTask.mutate({ data: { title: taskTitle, priority: taskPriority, entityType: "company", entityId: id } }, {
      onSuccess: () => {
        setTaskTitle("");
        toast({ title: "Task created" });
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ entityType: "company", entityId: id }) });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-20">
        <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-xl font-medium">Company not found</p>
        <Link href="/companies"><Button variant="outline" className="mt-4">Back to Companies</Button></Link>
      </div>
    );
  }

  const c = company as any;
  const activities = activitiesData?.data ?? [];
  const notes = Array.isArray(notesData) ? notesData : (notesData as any)?.data ?? [];
  const tasks = tasksData?.data ?? [];
  const contactsList = Array.isArray(contacts) ? contacts : (contacts as any)?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/companies">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Companies
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-[#118847]/10 flex items-center justify-center shrink-0">
            <Building2 className="h-7 w-7 text-[#118847]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{c.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {c.industry && <span className="text-sm text-muted-foreground">{c.industry}</span>}
              <Badge variant="outline" className={STAGE_COLORS[c.stage] ?? "bg-purple-100 text-purple-800 border-purple-200"}>
                {c.stage}
              </Badge>
              <Badge variant="outline" className={c.priority === "high" ? "text-red-700 border-red-200" : c.priority === "low" ? "text-blue-700 border-blue-200" : "text-yellow-700 border-yellow-200"}>
                {c.priority} priority
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit Company
          </Button>
          <Select value={c.stage} onValueChange={handleStageChange}>
            <SelectTrigger className="w-52 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Expected Revenue", value: c.expectedRevenue ? `₹${Number(c.expectedRevenue).toLocaleString("en-IN")}` : "—" },
          { label: "Scrap Weight (kg)", value: c.expectedScrapWeight ? `${Number(c.expectedScrapWeight).toLocaleString("en-IN")} kg` : "—" },
          { label: "Pickup Date", value: c.expectedPickupDate ?? "—" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-xl font-bold mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="bids">
        <TabsList className="bg-gray-100/80 flex-wrap h-auto gap-1">
          <TabsTrigger value="bids">Bid Comparison</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contactsList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bids" className="mt-4">
          <BidComparisonSection companyId={id} />
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Company Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: MapPin, label: "Location", value: [c.city, c.state].filter(Boolean).join(", ") || "—" },
                  { icon: Globe, label: "Website", value: c.website ?? "—" },
                  { icon: Tag, label: "GST", value: c.gst ?? "—" },
                  { icon: Tag, label: "PAN", value: c.pan ?? "—" },
                  { icon: Tag, label: "Lead Source", value: c.leadSource ?? "—" },
                  { icon: Calendar, label: "Added", value: new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div><span className="text-muted-foreground">{label}: </span><span className="font-medium">{value}</span></div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm"><span className="text-muted-foreground">Owner: </span><span className="font-medium">{c.ownerName ?? "Unassigned"}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Manager: </span><span className="font-medium">{c.assignedManagerName ?? "Unassigned"}</span></div>
                {c.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{c.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {activities.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-muted-foreground">No activities yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {activities.map((a: any) => (
                    <div key={a.id} className="flex gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="h-7 w-7 rounded-full bg-[#118847]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="h-3.5 w-3.5 text-[#118847]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(a.createdAt)}{a.userName ? ` · ${a.userName}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Add Note</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Write a note..." value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={3} />
              <Button onClick={handleAddNote} className="bg-[#118847] hover:bg-[#0e7038]" disabled={createNote.isPending || !noteContent.trim()}>
                {createNote.isPending ? "Adding..." : "Add Note"}
              </Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {notes.map((note: any) => (
              <Card key={note.id}>
                <CardContent className="pt-4">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{note.authorName ?? "Unknown"} · {timeAgo(note.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
            {notes.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">No notes yet. Add your first note above.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Add Task</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Task title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddTask} className="bg-[#118847] hover:bg-[#0e7038]" disabled={createTask.isPending || !taskTitle.trim()}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {tasks.map((task: any) => (
              <Card key={task.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex gap-1 shrink-0">
                      <Badge variant="outline" className={`text-xs ${task.priority === "high" ? "text-red-700 border-red-200" : task.priority === "low" ? "text-blue-700 border-blue-200" : "text-yellow-700 border-yellow-200"}`}>{task.priority}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">{task.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                  {task.dueDate && <p className="text-xs text-muted-foreground mt-1">Due: {task.dueDate}</p>}
                </CardContent>
              </Card>
            ))}
            {tasks.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                No tasks for this company
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {contactsList.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-muted-foreground">No contacts added</p>
                </div>
              ) : (
                <div className="divide-y">
                  {contactsList.map((contact: any) => (
                    <div key={contact.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="h-9 w-9 rounded-full bg-[#118847]/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-[#118847]">{contact.name?.[0] ?? "?"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{contact.name}</p>
                          {contact.isPrimary && <Badge variant="outline" className="text-xs text-green-700 border-green-200">Primary</Badge>}
                        </div>
                        {contact.designation && <p className="text-xs text-muted-foreground">{contact.designation}</p>}
                      </div>
                      <div className="text-right text-xs text-muted-foreground space-y-0.5">
                        {contact.email && <p>{contact.email}</p>}
                        {contact.phone && <p>{contact.phone}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Company Dialog */}
      <Dialog open={editOpen} onOpenChange={v => { if (!v) setEditOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Edit Company
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Company Name <span className="text-red-500">*</span></Label>
                <Input value={editForm.name} onChange={setEF("name")} placeholder="Acme Corp Pvt. Ltd." required />
              </div>

              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={editForm.industry} onValueChange={v => setEditForm(f => ({ ...f, industry: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={editForm.website} onChange={setEF("website")} placeholder="https://example.com" />
              </div>

              <div className="space-y-1.5">
                <Label>GST Number</Label>
                <Input value={editForm.gst} onChange={setEF("gst")} placeholder="22AAAAA0000A1Z5" />
              </div>

              <div className="space-y-1.5">
                <Label>PAN Number</Label>
                <Input value={editForm.pan} onChange={setEF("pan")} placeholder="AAAAA0000A" />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Input value={editForm.address} onChange={setEF("address")} placeholder="123 Main Street" />
              </div>

              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={editForm.state} onValueChange={v => setEditForm(f => ({ ...f, state: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={editForm.city} onChange={setEF("city")} placeholder="Mumbai" />
              </div>

              <div className="space-y-1.5">
                <Label>Pincode</Label>
                <Input value={editForm.pincode} onChange={setEF("pincode")} placeholder="400001" />
              </div>

              <div className="space-y-1.5">
                <Label>Lead Source</Label>
                <Input value={editForm.leadSource} onChange={setEF("leadSource")} placeholder="Referral / Website / Cold Call" />
              </div>

              <div className="space-y-1.5">
                <Label>Pipeline Stage</Label>
                <Select value={editForm.stage} onValueChange={v => setEditForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Assigned Team Member</Label>
                <Select value={editForm.ownerId} onValueChange={v => setEditForm(f => ({ ...f, ownerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-1 sm:col-span-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Project Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Expected Revenue (₹)</Label>
                    <Input type="number" value={editForm.expectedRevenue} onChange={setEF("expectedRevenue")} placeholder="500000" min="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Material Qty (kg)</Label>
                    <Input type="number" value={editForm.expectedScrapWeight} onChange={setEF("expectedScrapWeight")} placeholder="1000" min="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expected Pickup Date</Label>
                    <Input type="date" value={editForm.expectedPickupDate} onChange={setEF("expectedPickupDate")} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea value={editForm.notes} onChange={setEF("notes")} placeholder="Additional notes..." rows={3} />
              </div>

            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038]" disabled={updateCompany.isPending}>
                {updateCompany.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
