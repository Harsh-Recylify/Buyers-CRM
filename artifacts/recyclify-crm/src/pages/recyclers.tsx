import React from "react";
import {
  useListRecyclers, getListRecyclersQueryKey,
  useCreateRecycler, useUpdateRecycler, useDeleteRecycler,
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
import { Search, Plus, MoreHorizontal, Recycle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

type RecyclerFormData = {
  name: string; company: string; phone: string; email: string;
  gst: string; cpcbAuth: string; spcbAuth: string; certificates: string;
  address: string; materialCategories: string; capacity: string;
  pickupArea: string; paymentTerms: string; notes: string;
};

const emptyForm = (): RecyclerFormData => ({
  name: "", company: "", phone: "", email: "", gst: "",
  cpcbAuth: "", spcbAuth: "", certificates: "", address: "",
  materialCategories: "", capacity: "", pickupArea: "", paymentTerms: "", notes: "",
});

export default function Recyclers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<RecyclerFormData>(emptyForm());

  const { data, isLoading } = useListRecyclers(
    { search },
    { query: { queryKey: getListRecyclersQueryKey({ search }) } }
  );

  const createRecycler = useCreateRecycler({
    mutation: {
      onSuccess: () => {
        toast({ title: "Recycler added successfully" });
        queryClient.invalidateQueries({ queryKey: getListRecyclersQueryKey() });
        closeModal();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const updateRecycler = useUpdateRecycler({
    mutation: {
      onSuccess: () => {
        toast({ title: "Recycler updated" });
        queryClient.invalidateQueries({ queryKey: getListRecyclersQueryKey() });
        closeModal();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const deleteRecycler = useDeleteRecycler({
    mutation: {
      onSuccess: () => {
        toast({ title: "Recycler removed" });
        queryClient.invalidateQueries({ queryKey: getListRecyclersQueryKey() });
        setDeletingId(null);
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    },
  });

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm()); };

  const openEdit = (recycler: any) => {
    setEditingId(recycler.id);
    setForm({
      name: recycler.name || "", company: recycler.company || "",
      phone: recycler.phone || "", email: recycler.email || "",
      gst: recycler.gst || "", cpcbAuth: recycler.cpcbAuth || "",
      spcbAuth: recycler.spcbAuth || "", certificates: recycler.certificates || "",
      address: recycler.address || "",
      materialCategories: (recycler.materialCategories || []).join(", "),
      capacity: recycler.capacity || "", pickupArea: recycler.pickupArea || "",
      paymentTerms: recycler.paymentTerms || "", notes: recycler.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Recycler name is required", variant: "destructive" }); return;
    }
    const payload = {
      name: form.name.trim(),
      ...(form.company && { company: form.company }),
      ...(form.phone && { phone: form.phone }),
      ...(form.email && { email: form.email }),
      ...(form.gst && { gst: form.gst }),
      ...(form.cpcbAuth && { cpcbAuth: form.cpcbAuth }),
      ...(form.spcbAuth && { spcbAuth: form.spcbAuth }),
      ...(form.certificates && { certificates: form.certificates }),
      ...(form.address && { address: form.address }),
      materialCategories: form.materialCategories.split(",").map((s) => s.trim()).filter(Boolean),
      ...(form.capacity && { capacity: form.capacity }),
      ...(form.pickupArea && { pickupArea: form.pickupArea }),
      ...(form.paymentTerms && { paymentTerms: form.paymentTerms }),
      ...(form.notes && { notes: form.notes }),
    };
    if (editingId) {
      updateRecycler.mutate({ id: editingId, data: payload });
    } else {
      createRecycler.mutate({ data: payload });
    }
  };

  const setInput = (field: keyof RecyclerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const isPending = createRecycler.isPending || updateRecycler.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recyclers</h1>
          <p className="text-muted-foreground mt-1">Manage CPCB-certified recycling partners.</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => { setEditingId(null); setForm(emptyForm()); setShowModal(true); }}>
          <Plus className="h-4 w-4" />
          Add Recycler
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm flex flex-col">
        <div className="p-4 border-b flex gap-4 items-center bg-gray-50/50 rounded-t-xl">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recyclers..."
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
                <TableHead>Recycler Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>CPCB Auth</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(7).fill(0).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>)}
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Recycle className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900">No recyclers found</p>
                      <p className="text-sm">Click "Add Recycler" to add your first recycling partner.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((recycler) => (
                  <TableRow key={recycler.id} className="group">
                    <TableCell>
                      <div className="font-medium text-gray-900">{recycler.name}</div>
                      {recycler.email && <div className="text-xs text-muted-foreground">{recycler.email}</div>}
                    </TableCell>
                    <TableCell>{recycler.company || "-"}</TableCell>
                    <TableCell>
                      {recycler.cpcbAuth ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          {recycler.cpcbAuth}
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>{recycler.capacity || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(recycler.materialCategories || []).slice(0, 2).map((m: string) => (
                          <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                        ))}
                        {(recycler.materialCategories || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">+{(recycler.materialCategories || []).length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={recycler.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>
                        {recycler.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(recycler)}>Edit Recycler</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(recycler.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Recycler Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Recycler" : "Add Recycler"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="r-name">Recycler Name *</Label>
                <Input id="r-name" placeholder="Green Earth Recyclers" value={form.name} onChange={setInput("name")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-company">Company Name</Label>
                <Input id="r-company" placeholder="Company Pvt. Ltd." value={form.company} onChange={setInput("company")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-phone">Phone</Label>
                <Input id="r-phone" placeholder="+91 98765 43210" value={form.phone} onChange={setInput("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-email">Email</Label>
                <Input id="r-email" type="email" placeholder="recycler@example.com" value={form.email} onChange={setInput("email")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-gst">GST Number</Label>
                <Input id="r-gst" placeholder="22AAAAA0000A1Z5" value={form.gst} onChange={setInput("gst")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-cpcb">CPCB Authorization No.</Label>
                <Input id="r-cpcb" placeholder="CPCB/2024/XX/001" value={form.cpcbAuth} onChange={setInput("cpcbAuth")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-spcb">SPCB Authorization No.</Label>
                <Input id="r-spcb" placeholder="SPCB/2024/XX/001" value={form.spcbAuth} onChange={setInput("spcbAuth")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-certificates">Certificates</Label>
                <Input id="r-certificates" placeholder="ISO 14001, E-Waste cert..." value={form.certificates} onChange={setInput("certificates")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="r-address">Address</Label>
                <Input id="r-address" placeholder="Plant address" value={form.address} onChange={setInput("address")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="r-materials">Material Categories</Label>
                <Input id="r-materials" placeholder="Laptops, Servers, Batteries" value={form.materialCategories} onChange={setInput("materialCategories")} />
                <p className="text-xs text-muted-foreground">Type categories separated by commas.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-capacity">Processing Capacity</Label>
                <Input id="r-capacity" placeholder="500 MT/month" value={form.capacity} onChange={setInput("capacity")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-pickupArea">Pickup Area / States</Label>
                <Input id="r-pickupArea" placeholder="Maharashtra, Gujarat, Karnataka" value={form.pickupArea} onChange={setInput("pickupArea")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-paymentTerms">Payment Terms</Label>
                <Input id="r-paymentTerms" placeholder="Net 30 / Advance" value={form.paymentTerms} onChange={setInput("paymentTerms")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="r-notes">Notes</Label>
                <Textarea id="r-notes" placeholder="Additional notes..." value={form.notes} onChange={setInput("notes")} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : editingId ? "Update Recycler" : "Add Recycler"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Recycler?</AlertDialogTitle>
            <AlertDialogDescription>This will deactivate the recycler partner.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingId && deleteRecycler.mutate({ id: deletingId })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
