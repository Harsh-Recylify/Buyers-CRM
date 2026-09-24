import React from "react";
import * as XLSX from "xlsx";
import {
  useListBuyers, getListBuyersQueryKey,
  useCreateBuyer, useUpdateBuyer, useDeleteBuyer,
  useListUsers, getListUsersQueryKey,
  useImportBuyers, type BuyerImportResult,
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
import { Search, Plus, MoreHorizontal, Users, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const BUYER_TYPES = ["Trader", "Recycler", "Refurbisher", "Scraper"];

const IMPORT_COLUMNS = ["Buyer Name", "Company Name", "Phone", "City", "Assigned Team Member"];

type ImportRow = { name: string; company: string; phone: string; city: string; assignedTeamMember: string };

function normalizeHeader(h: unknown) {
  return String(h ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
}

const HEADER_MAP: Record<string, keyof ImportRow> = {
  buyername: "name",
  name: "name",
  companyname: "company",
  company: "company",
  phone: "phone",
  mobile: "phone",
  city: "city",
  assignedteammember: "assignedTeamMember",
  teammember: "assignedTeamMember",
  assignedto: "assignedTeamMember",
};

function parseWorkbook(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (grid.length === 0) return [];

  const headerRow = grid[0];
  const colMap: Record<number, keyof ImportRow> = {};
  headerRow.forEach((h, i) => {
    const mapped = HEADER_MAP[normalizeHeader(h)];
    if (mapped) colMap[i] = mapped;
  });

  const rows: ImportRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const line = grid[r];
    if (!line || line.every((c) => String(c ?? "").trim() === "")) continue;
    const row: ImportRow = { name: "", company: "", phone: "", city: "", assignedTeamMember: "" };
    Object.entries(colMap).forEach(([idx, field]) => {
      row[field] = String(line[Number(idx)] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    IMPORT_COLUMNS,
    ["Ramesh Kumar", "Kumar Recyclers Pvt Ltd", "+91 98765 43210", "Mumbai", "Deepanshu Batra"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Buyers");
  XLSX.writeFile(wb, "buyer-import-template.xlsx");
}

type BuyerFormData = {
  name: string; company: string; phone: string; email: string;
  gst: string; address: string; state: string; city: string;
  materialCategories: string; preferredMaterials: string;
  pickupStates: string[]; buyerType: string; assignedToId: string; notes: string;
};

const emptyForm = (): BuyerFormData => ({
  name: "", company: "", phone: "", email: "", gst: "",
  address: "", state: "", city: "", materialCategories: "",
  preferredMaterials: "", pickupStates: [], buyerType: "", assignedToId: "", notes: "",
});

export default function Buyers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<BuyerFormData>(emptyForm());
  const [showImport, setShowImport] = React.useState(false);
  const [importRows, setImportRows] = React.useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = React.useState("");
  const [importResult, setImportResult] = React.useState<BuyerImportResult | null>(null);
  const [importParseError, setImportParseError] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data, isLoading } = useListBuyers(
    { search },
    { query: { queryKey: getListBuyersQueryKey({ search }) } }
  );

  const { data: usersData } = useListUsers({}, { query: { queryKey: getListUsersQueryKey({}) } });
  const users = usersData?.data ?? [];

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

  const importBuyers = useImportBuyers({
    mutation: {
      onSuccess: (result) => {
        setImportResult(result);
        queryClient.invalidateQueries({ queryKey: getListBuyersQueryKey() });
      },
      onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
    },
  });

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm()); };

  const closeImport = () => {
    setShowImport(false);
    setImportRows([]);
    setImportFileName("");
    setImportResult(null);
    setImportParseError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportResult(null);
    setImportParseError("");
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseWorkbook(buffer);
      if (rows.length === 0) {
        setImportParseError("No rows found. Make sure the first row has column headers matching the format below.");
        setImportRows([]);
      } else {
        setImportRows(rows);
      }
    } catch (err: any) {
      setImportParseError("Couldn't read that file. Please upload a valid .xlsx, .xls, or .csv file.");
      setImportRows([]);
    }
  };

  const handleImportSubmit = () => {
    if (importRows.length === 0) return;
    importBuyers.mutate({ data: { rows: importRows } });
  };

  const openEdit = (buyer: any) => {
    setEditingId(buyer.id);
    setForm({
      name: buyer.name || "", company: buyer.company || "",
      phone: buyer.phone || "", email: buyer.email || "",
      gst: buyer.gst || "",
      address: buyer.address || "", state: buyer.state || "", city: buyer.city || "",
      materialCategories: (buyer.materialCategories || []).join(", "),
      preferredMaterials: buyer.preferredMaterials || "",
      pickupStates: buyer.pickupStates || [],
      buyerType: buyer.buyerType || "",
      assignedToId: buyer.assignedToId ? String(buyer.assignedToId) : "",
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
      ...(form.address && { address: form.address }),
      ...(form.state && { state: form.state }),
      ...(form.city && { city: form.city }),
      materialCategories: form.materialCategories.split(",").map((s) => s.trim()).filter(Boolean),
      ...(form.preferredMaterials && { preferredMaterials: form.preferredMaterials }),
      pickupStates: form.pickupStates,
      ...(form.buyerType && { buyerType: form.buyerType }),
      ...(form.assignedToId && { assignedToId: parseInt(form.assignedToId) }),
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
  const set = (field: keyof BuyerFormData) => (v: string) => setForm((f) => ({ ...f, [field]: v }));

  const isPending = createBuyer.isPending || updateBuyer.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyer Directory</h1>
          <p className="text-muted-foreground mt-1">Manage e-waste buyers and bidders.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button className="gap-2" onClick={() => { setEditingId(null); setForm(emptyForm()); setShowModal(true); }}>
            <Plus className="h-4 w-4" />
            Add Buyer
          </Button>
        </div>
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
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    {Array(8).fill(0).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-24" /></TableCell>)}
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
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
                    <TableCell>
                      {buyer.buyerType ? <Badge variant="secondary" className="text-xs">{buyer.buyerType}</Badge> : "-"}
                    </TableCell>
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
                    <TableCell className="text-sm text-gray-600">{buyer.assignedToName || "-"}</TableCell>
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
                <Label>Buyer Type</Label>
                <Select value={form.buyerType} onValueChange={set("buyerType")}>
                  <SelectTrigger><SelectValue placeholder="Select buyer type" /></SelectTrigger>
                  <SelectContent>
                    {BUYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Assigned Team Member</Label>
                <Select value={form.assignedToId} onValueChange={set("assignedToId")}>
                  <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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

      {/* Import Buyers */}
      <Dialog open={showImport} onOpenChange={(open) => { if (!open) closeImport(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Import Buyers from Spreadsheet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Upload an Excel (.xlsx) or CSV file with the first row as column headers, in this format:
              </p>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {IMPORT_COLUMNS.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Ramesh Kumar</TableCell>
                      <TableCell className="text-muted-foreground">Kumar Recyclers Pvt Ltd</TableCell>
                      <TableCell className="text-muted-foreground">+91 98765 43210</TableCell>
                      <TableCell className="text-muted-foreground">Mumbai</TableCell>
                      <TableCell className="text-muted-foreground">Deepanshu Batra</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Only "Buyer Name" is required. "Assigned Team Member" should match an existing team member's name exactly.
              </p>
              <Button type="button" variant="link" size="sm" className="px-0 h-auto mt-1 gap-1" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Download blank template
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="import-file">Spreadsheet file</Label>
              <Input id="import-file" ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
            </div>

            {importParseError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {importParseError}
              </div>
            )}

            {importRows.length > 0 && !importResult && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {importRows.length} buyer{importRows.length !== 1 ? "s" : ""} found in "{importFileName}", ready to import.
              </div>
            )}

            {importResult && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  Imported {importResult.imported} buyer{importResult.imported !== 1 ? "s" : ""}
                  {importResult.failed > 0 ? `, ${importResult.failed} failed.` : "."}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg border max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Issue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.map((err, i) => (
                          <TableRow key={i}>
                            <TableCell>{err.row}</TableCell>
                            <TableCell>{err.name || "-"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{err.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeImport}>
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                type="button"
                onClick={handleImportSubmit}
                disabled={importRows.length === 0 || importBuyers.isPending}
              >
                {importBuyers.isPending ? "Importing..." : `Import ${importRows.length || ""} Buyer${importRows.length === 1 ? "" : "s"}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
