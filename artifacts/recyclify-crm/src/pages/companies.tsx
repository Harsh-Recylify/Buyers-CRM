import React from "react";
import * as XLSX from "xlsx";
import {
  useListCompanies, getListCompaniesQueryKey,
  useCreateCompany, useUpdateCompany, useDeleteCompany,
  useListUsers, getListUsersQueryKey,
  useListPipelineBoards, getListPipelineBoardsQueryKey,
  useListPipelineStages, getListPipelineStagesQueryKey,
  getGetPipelineQueryKey,
  useImportCompanies, type CompanyImportResult,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Plus, Filter, MoreHorizontal, ArrowRight, Building2, X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const IMPORT_COLUMNS = ["Company Name", "State", "Pipeline", "Expected Target", "Expected Pickup"];

type ImportRow = { name: string; state: string; pipelineType: string; expectedRevenue: string; expectedPickupDate: string };

function normalizeHeader(h: unknown) {
  return String(h ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
}

const HEADER_MAP: Record<string, keyof ImportRow> = {
  companyname: "name",
  name: "name",
  state: "state",
  pipeline: "pipelineType",
  pipelinetype: "pipelineType",
  expectedtarget: "expectedRevenue",
  target: "expectedRevenue",
  expectedrevenue: "expectedRevenue",
  expectedpickup: "expectedPickupDate",
  expectedpickupdate: "expectedPickupDate",
  pickupdate: "expectedPickupDate",
};

function parseWorkbook(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
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
    const row: ImportRow = { name: "", state: "", pipelineType: "", expectedRevenue: "", expectedPickupDate: "" };
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
    ["Acme Corp Pvt. Ltd.", "Maharashtra", "Main Pipeline", "500000", "2026-10"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Companies");
  XLSX.writeFile(wb, "company-import-template.xlsx");
}

const PIPELINE_TYPES = [
  { value: "main", label: "Main Pipeline", color: "#118847" },
  { value: "battery", label: "Battery Pipeline", color: "#f59e0b" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"];
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Chandigarh","Other",
];

type CompanyFormData = {
  name: string;
  state: string;
  pipelineType: string;
  stage: string;
  priority: string;
  expectedScrapWeight: string;
  expectedRevenue: string;
  expectedPickupDate: string;
  notes: string;
};

const emptyForm = (defaultStage: string): CompanyFormData => ({
  name: "",
  state: "",
  pipelineType: "main",
  stage: defaultStage, priority: "medium",
  expectedScrapWeight: "", expectedRevenue: "", expectedPickupDate: "", notes: "",
});

export default function Companies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<CompanyFormData>(emptyForm(""));
  const [page, setPage] = React.useState(1);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [stageFilter, setStageFilter] = React.useState<string>("");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("");
  const [ownerFilter, setOwnerFilter] = React.useState<string>("");
  const [pipelineTypeFilter, setPipelineTypeFilter] = React.useState<string>("");

  // Pipeline stages are configured centrally (Pipeline page); both boards
  // share the same stage names, so the main board's list is the canonical
  // source for stage dropdowns/filters/colors here.
  const { data: boardsData } = useListPipelineBoards({ query: { queryKey: getListPipelineBoardsQueryKey() } });
  const mainBoard = boardsData?.data.find((b) => b.isDefault) ?? boardsData?.data[0];
  const { data: stagesData } = useListPipelineStages(mainBoard?.id ?? 0, {
    query: { enabled: !!mainBoard, queryKey: getListPipelineStagesQueryKey(mainBoard?.id ?? 0) },
  });
  const pipelineStages = stagesData?.data ?? [];
  const stageColorMap = new Map(pipelineStages.map((s) => [s.name, s.color]));

  // Stages load asynchronously; if the Add Company modal is opened before
  // they arrive, the form starts with no stage selected. Backfill it once
  // the list shows up rather than letting the company get created with a
  // blank stage.
  React.useEffect(() => {
    if (showModal && !editingId && !form.stage && pipelineStages.length > 0) {
      setForm((f) => ({ ...f, stage: pipelineStages[0].name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineStages.length, showModal]);

  const [showImport, setShowImport] = React.useState(false);
  const [importRows, setImportRows] = React.useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = React.useState("");
  const [importResult, setImportResult] = React.useState<CompanyImportResult | null>(null);
  const [importParseError, setImportParseError] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const activeFilterCount = [stageFilter, priorityFilter, ownerFilter, pipelineTypeFilter].filter(Boolean).length;

  const listParams = {
    search,
    page,
    limit: 20,
    ...(stageFilter && { stage: stageFilter }),
    ...(priorityFilter && { priority: priorityFilter }),
    ...(ownerFilter && { ownerId: parseInt(ownerFilter) }),
    ...(pipelineTypeFilter && { pipelineType: pipelineTypeFilter }),
  };

  const { data, isLoading } = useListCompanies(
    listParams,
    { query: { queryKey: getListCompaniesQueryKey(listParams) } }
  );

  const clearFilters = () => {
    setStageFilter("");
    setPriorityFilter("");
    setOwnerFilter("");
    setPipelineTypeFilter("");
    setPage(1);
  };

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

  const defaultStageName = pipelineStages[0]?.name ?? "";

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm(defaultStageName));
  };

  const importCompanies = useImportCompanies({
    mutation: {
      onSuccess: (result) => {
        setImportResult(result);
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey() });
      },
      onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
    },
  });

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
    } catch {
      setImportParseError("Couldn't read that file. Please upload a valid .xlsx, .xls, or .csv file.");
      setImportRows([]);
    }
  };

  const handleImportSubmit = () => {
    if (importRows.length === 0) return;
    importCompanies.mutate({ data: { rows: importRows } });
  };

  const openEdit = (company: any) => {
    setEditingId(company.id);
    setForm({
      name: company.name || "",
      state: company.state || "",
      pipelineType: company.pipelineType || "main",
      stage: company.stage || defaultStageName,
      priority: company.priority || "medium",
      expectedScrapWeight: company.expectedScrapWeight ? String(company.expectedScrapWeight) : "",
      expectedRevenue: company.expectedRevenue ? String(company.expectedRevenue) : "",
      expectedPickupDate: company.expectedPickupDate ? company.expectedPickupDate.substring(0, 7) : "",
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
    if (!form.stage) {
      toast({ title: "Please select a pipeline stage", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      ...(form.state && { state: form.state }),
      pipelineType: form.pipelineType,
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

  const getStageBadgeStyle = (stage: string): React.CSSProperties => {
    const color = stageColorMap.get(stage) ?? "#6b7280";
    return { color, borderColor: `${color}40`, background: `${color}14` };
  };

  const isPending = createCompany.isPending || updateCompany.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage corporate clients and their IT asset lifecycle.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button className="gap-2" onClick={() => { setEditingId(null); setForm(emptyForm(defaultStageName)); setShowModal(true); }}>
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
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
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto gap-2 bg-white">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center rounded-full px-1">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Filters</p>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-auto gap-1 px-2 py-1 text-xs" onClick={clearFilters}>
                        <X className="h-3 w-3" />
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Pipeline</Label>
                    <Select
                      value={pipelineTypeFilter || "all"}
                      onValueChange={(v) => { setPipelineTypeFilter(v === "all" ? "" : v); setPage(1); }}
                    >
                      <SelectTrigger><SelectValue placeholder="All pipelines" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All pipelines</SelectItem>
                        {PIPELINE_TYPES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.color }} />
                              {p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Pipeline Stage</Label>
                    <Select
                      value={stageFilter || "all"}
                      onValueChange={(v) => { setStageFilter(v === "all" ? "" : v); setPage(1); }}
                    >
                      <SelectTrigger><SelectValue placeholder="All stages" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All stages</SelectItem>
                        {pipelineStages.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full inline-block" style={{ background: s.color }} />
                              {s.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select
                      value={priorityFilter || "all"}
                      onValueChange={(v) => { setPriorityFilter(v === "all" ? "" : v); setPage(1); }}
                    >
                      <SelectTrigger><SelectValue placeholder="All priorities" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All priorities</SelectItem>
                        {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Owner</Label>
                    <Select
                      value={ownerFilter || "all"}
                      onValueChange={(v) => { setOwnerFilter(v === "all" ? "" : v); setPage(1); }}
                    >
                      <SelectTrigger><SelectValue placeholder="All owners" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All owners</SelectItem>
                        {users.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-medium" style={getStageBadgeStyle(company.stage)}>
                          {company.stage}
                        </Badge>
                        {company.pipelineType === "battery" && (
                          <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 bg-amber-50">Battery</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getPriorityColor(company.priority)} border-transparent`}>
                        {company.priority.charAt(0).toUpperCase() + company.priority.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {company.expectedRevenue ? `₹${company.expectedRevenue.toLocaleString("en-IN")}` : "-"}
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
                <Label>State</Label>
                <Select value={form.state} onValueChange={set("state")}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Pipeline</Label>
                <Select value={form.pipelineType} onValueChange={set("pipelineType")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PIPELINE_TYPES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.color }} />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Pipeline Stage</Label>
                <Select value={form.stage} onValueChange={set("stage")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full inline-block" style={{ background: s.color }} />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
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
                <Label htmlFor="expectedRevenue">Estimated Project Value (₹)</Label>
                <Input id="expectedRevenue" type="number" placeholder="500000" value={form.expectedRevenue} onChange={setInput("expectedRevenue")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expectedScrapWeight">Expected Material Qty (kg)</Label>
                <Input id="expectedScrapWeight" type="number" placeholder="1000" value={form.expectedScrapWeight} onChange={setInput("expectedScrapWeight")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expectedPickupDate">Expected Pickup (Month & Year)</Label>
                <Input id="expectedPickupDate" type="month" value={form.expectedPickupDate} onChange={setInput("expectedPickupDate")} />
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

      {/* Import Companies */}
      <Dialog open={showImport} onOpenChange={(open) => { if (!open) closeImport(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Import Companies from Spreadsheet
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
                      <TableCell className="text-muted-foreground">Acme Corp Pvt. Ltd.</TableCell>
                      <TableCell className="text-muted-foreground">Maharashtra</TableCell>
                      <TableCell className="text-muted-foreground">Main Pipeline</TableCell>
                      <TableCell className="text-muted-foreground">500000</TableCell>
                      <TableCell className="text-muted-foreground">2026-10</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Only "Company Name" is required. "Pipeline" accepts "Main Pipeline" or "Battery Pipeline"
                (defaults to Main if left blank or unrecognized) and/or an exact stage name, e.g. "Quote
                Submitted" or "Battery Pipeline - Invoice". Without a stage name, new companies are added
                to the first stage of their pipeline. "Expected Pickup" takes a month and year, e.g.
                "2026-10", "Oct 2026" or "10/2026".
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
                {importRows.length} compan{importRows.length !== 1 ? "ies" : "y"} found in "{importFileName}", ready to import.
              </div>
            )}

            {importResult && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  Imported {importResult.imported} compan{importResult.imported !== 1 ? "ies" : "y"}
                  {importResult.failed > 0 ? `, ${importResult.failed} failed.` : "."}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg border max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead>Company</TableHead>
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
                disabled={importRows.length === 0 || importCompanies.isPending}
              >
                {importCompanies.isPending ? "Importing..." : `Import ${importRows.length || ""} Compan${importRows.length === 1 ? "y" : "ies"}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
