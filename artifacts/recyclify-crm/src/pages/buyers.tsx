import React from "react";
import {
  useListBuyers, getListBuyersQueryKey,
  useCreateBuyer, useUpdateBuyer, useDeleteBuyer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, MoreHorizontal, Users } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type BuyerFormData = {
  name: string; company: string; phone: string; email: string;
  gst: string; pan: string; address: string; state: string; city: string;
  materialCategories: string; maxBid: string; preferredMaterials: string;
  pickupStates: string[]; paymentTerms: string; notes: string;
};

const emptyForm = (): BuyerFormData => ({
  name: "", company: "", phone: "", email: "", gst: "", pan: "",
  address: "", state: "", city: "", materialCategories: "", maxBid: "",
  preferredMaterials: "", pickupStates: [], paymentTerms: "", notes: "",
});

export default function Buyers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<BuyerFormData>(emptyForm());

  const { data, isLoading } = useListBuyers(
    { search },
    { query: { queryKey: getListBuyersQueryKey({ search }) } }
  );

  const createBuyer = useCreateBuyer({
    mutation: {
      onSuccess: () => {
        toast({ title: "Buyer added successfully" });
        queryClient.invalidateQueries({ queryKey: getListBuyersQueryKey() });
        closeModal();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const updateBuyer = useUpdateBuyer({
    mutation: {
      onSuccess: () => {
        toast({ title: "Buyer updated" });
        queryClient.invalidateQueries({ queryKey: getListBuyersQueryKey() });
        closeModal();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const deleteBuyer = useDeleteBuyer({
    mutation: {
      onSuccess: () => {
        toast({ title: "Buyer removed" });
        queryClient.invalidateQueries({ queryKey: getListBuyersQueryKey() });
        setDeletingId(null);
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm()); };

  const openEdit = (buyer: any) => {
    setEditingId(buyer.id);
    setForm({
      name: buyer.name || "", company: buyer.company || "",
      phone: buyer.phone || "", email: buyer.email || "",
      gst: buyer.gst || "", pan: buyer.pan || "",
      address: buyer.address || "", state: buyer.state || "", city: buyer.city || "",
      materialCategories: (buyer.materialCategories || []).join(", "),
      maxBid: buyer.maxBid ? String(buyer.maxBid) : "",
      preferredMaterials: buyer.preferredMaterials || "",
      pickupStates: buyer.pickupStates || [],
      paymentTerms: buyer.paymentTerms || "",
      notes: buyer.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Buyer name is required", variant: "destructive" }); return;
    }
    const payload = {
      name: form.name.trim(),
      ...(form.company && { company: form.company }),
      ...(form.phone && { phone: form.phone }),
      ...(form.email && { email: form.email }),
      ...(form.gst && { gst: form.gst }),
      ...(form.pan && { pan: form.pan }),
      ...(form.address && { address: form.address }),
      ...(form.state && { state: form.state }),
      ...(form.city && { city: form.city }),
      materialCategories: form.materialCategories.split(",").map((s) => s.trim()).filter(Boolean),
      ...(form.maxBid && { maxBid: parseFloat(form.maxBid) }),
      ...(form.preferredMaterials && { preferredMaterials: form.preferredMaterials }),
      pickupStates: form.pickupStates,
      ...(form.paymentTerms && { paymentTerms: form.paymentTerms }),
      ...(form.notes && { notes: form.notes }),
    };
    if (editingId) {
      updateBuyer.mutate({ id: editingId, data: payload });
    } else {
      createBuyer.mutate({ data: payload });
    }
  };

  const setInput = (field: keyof BuyerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const isPending = createBuyer.isPending || updateBuyer.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyers</h1>
          <p className="text-muted-foreground mt-1">Manage e-waste buyers and bidders.</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => { setEditingId(null); setForm(emptyForm()); setShowModal(true); }}>
          <Plus className="h-4 w-4" />
          Add Buyer
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col">
        <div className="p-4 border-b flex gap-4 items-center bg-gray-50/50 rounded-t-xl">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search buyers..."
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(6).fill(0).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>)}
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900">No buyers found</p>
                      <p className="text-sm">Click "Add Buyer" to add your first buyer.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((buyer) => (
                  <TableRow key={buyer.id} className="group">
                    <TableCell>
                      <div className="font-medium text-gray-900">{buyer.name}</div>
                      {buyer.email && <div className="text-xs text-muted-foreground">{buyer.email}</div>}
                    </TableCell>
                    <TableCell>{buyer.company || "-"}</TableCell>
                    <TableCell>{buyer.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(buyer.materialCategories || []).slice(0, 2).map((m: string) => (
                          <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                        ))}
                        {(buyer.materialCategories || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">+{(buyer.materialCategories || []).length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={buyer.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600"}>
                        {buyer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/buyers/${buyer.id}`}>View</Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(buyer)}>Edit Buyer</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(buyer.id)}>Delete</DropdownMenuItem>
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
      </div>

      {/* Add / Edit Buyer Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Buyer" : "Add Buyer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="b-name">Buyer Name *</Label>
                <Input id="b-name" placeholder="John Doe" value={form.name} onChange={setInput("name")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-company">Company Name</Label>
                <Input id="b-company" placeholder="Buyer Company Ltd." value={form.company} onChange={setInput("company")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-phone">Phone</Label>
                <Input id="b-phone" placeholder="+91 98765 43210" value={form.phone} onChange={setInput("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-email">Email</Label>
                <Input id="b-email" type="email" placeholder="buyer@example.com" value={form.email} onChange={setInput("email")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-gst">GST Number</Label>
                <Input id="b-gst" placeholder="22AAAAA0000A1Z5" value={form.gst} onChange={setInput("gst")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-pan">PAN Number</Label>
                <Input id="b-pan" placeholder="AAAAA0000A" value={form.pan} onChange={setInput("pan")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="b-address">Address</Label>
                <Input id="b-address" placeholder="Street address" value={form.address} onChange={setInput("address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-state">State</Label>
                <Input id="b-state" placeholder="Maharashtra" value={form.state} onChange={setInput("state")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-city">City</Label>
                <Input id="b-city" placeholder="Mumbai" value={form.city} onChange={setInput("city")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="b-materials">Material Categories</Label>
                <Input id="b-materials" placeholder="Laptops, Servers, Batteries" value={form.materialCategories} onChange={setInput("materialCategories")} />
                <p className="text-xs text-muted-foreground">Type categories separated by commas.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-maxBid">Maximum Bid Value (₹)</Label>
                <Input id="b-maxBid" type="number" placeholder="100000" value={form.maxBid} onChange={setInput("maxBid")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-paymentTerms">Payment Terms</Label>
                <Input id="b-paymentTerms" placeholder="Net 30 / Advance / COD" value={form.paymentTerms} onChange={setInput("paymentTerms")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="b-notes">Notes</Label>
                <Textarea id="b-notes" placeholder="Notes about this buyer..." value={form.notes} onChange={setInput("notes")} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : editingId ? "Update Buyer" : "Add Buyer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Buyer?</AlertDialogTitle>
            <AlertDialogDescription>This action will deactivate the buyer. Bid history will be preserved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingId && deleteBuyer.mutate({ id: deletingId })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
