import React from "react";
import {
  useGetPipeline, getGetPipelineQueryKey, getListCompaniesQueryKey,
  useUpdateCompanyStage, useUpdateCompany,
  useListPipelineBoards, useCreatePipelineBoard, useUpdatePipelineBoard, useDeletePipelineBoard,
  useListPipelineStages, useCreatePipelineStage, useUpdatePipelineStage, useDeletePipelineStage,
  getListPipelineBoardsQueryKey, getListPipelineStagesQueryKey,
  type PipelineStage, type PipelineBoard,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
  Settings2, Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  Check, X, Building2, ExternalLink, GripVertical,
} from "lucide-react";

const BOARD_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#14b8a6", "#22c55e", "#6366f1", "#ec4899",
  "#f97316", "#06b6d4", "#a855f7", "#118847",
];

const STAGE_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#6b7280", "#14b8a6", "#22c55e", "#6366f1",
  "#ec4899", "#f97316", "#06b6d4", "#a855f7",
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

// ─── Company Quick-Edit Modal ────────────────────────────────────────────────
function CompanyEditModal({
  company,
  stages,
  onClose,
}: {
  company: any;
  stages: PipelineStage[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateCompany = useUpdateCompany();

  const [form, setForm] = React.useState({
    name: company.name ?? "",
    industry: company.industry ?? "",
    priority: company.priority ?? "medium",
    stage: company.stage ?? "",
    expectedRevenue: company.expectedRevenue != null ? String(company.expectedRevenue) : "",
    expectedScrapWeight: company.expectedScrapWeight != null ? String(company.expectedScrapWeight) : "",
    expectedPickupDate: company.expectedPickupDate ?? "",
    notes: company.notes ?? "",
  });

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  }

  function handleSave() {
    const payload: Record<string, any> = {
      name: form.name,
      industry: form.industry || null,
      priority: form.priority,
      stage: form.stage,
      notes: form.notes || null,
      expectedRevenue: form.expectedRevenue ? Number(form.expectedRevenue) : null,
      expectedScrapWeight: form.expectedScrapWeight ? Number(form.expectedScrapWeight) : null,
      expectedPickupDate: form.expectedPickupDate || null,
    };

    updateCompany.mutate({ id: company.id, data: payload }, {
      onSuccess: () => {
        toast({ title: "Company updated" });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/pipeline"] });
        onClose();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#118847]" />
            Edit Company
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Company Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={field("name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Industry</Label>
              <Input value={form.industry} onChange={field("industry")} placeholder="IT, Manufacturing..." />
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Pipeline Stage</Label>
            <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map(s => (
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Expected Revenue (₹)</Label>
              <Input type="number" value={form.expectedRevenue} onChange={field("expectedRevenue")} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Scrap Weight (kg)</Label>
              <Input type="number" value={form.expectedScrapWeight} onChange={field("expectedScrapWeight")} placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Expected Pickup Date</Label>
            <Input type="date" value={form.expectedPickupDate} onChange={field("expectedPickupDate")} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={field("notes")} rows={2} />
          </div>
        </div>
        <DialogFooter className="mt-4 flex items-center justify-between gap-2">
          <Link href={`/companies/${company.id}`} onClick={onClose}>
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> Full Details
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button className="bg-[#118847] hover:bg-[#0e7038]" onClick={handleSave} disabled={updateCompany.isPending}>
              {updateCompany.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manage Stages Sheet ─────────────────────────────────────────────────────
function ManageStagesSheet({
  open,
  onOpenChange,
  boardId,
  stages,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  boardId: number;
  stages: PipelineStage[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const stagesKey = getListPipelineStagesQueryKey(boardId);

  const createStage = useCreatePipelineStage();
  const updateStage = useUpdatePipelineStage();
  const deleteStage = useDeletePipelineStage();

  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState("#3b82f6");
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editColor, setEditColor] = React.useState("");

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: stagesKey });
    queryClient.invalidateQueries({ queryKey: ["/pipeline"] });
  }

  function handleAdd() {
    if (!newName.trim()) return;
    createStage.mutate(
      { boardId, data: { name: newName.trim(), color: newColor } },
      {
        onSuccess: () => { setNewName(""); setNewColor("#3b82f6"); invalidate(); toast({ title: "Stage added" }); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  }

  function startEdit(stage: PipelineStage) {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditColor(stage.color);
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    updateStage.mutate(
      { id: editingId, data: { name: editName.trim(), color: editColor } },
      {
        onSuccess: () => { setEditingId(null); invalidate(); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  }

  function moveStage(stage: PipelineStage, dir: "up" | "down") {
    const sorted = [...stages].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(s => s.id === stage.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx]!;
    Promise.all([
      updateStage.mutateAsync({ id: stage.id, data: { name: stage.name, position: other.position } }),
      updateStage.mutateAsync({ id: other.id, data: { name: other.name, position: stage.position } }),
    ]).then(() => invalidate()).catch(() => {});
  }

  function handleDelete(stage: PipelineStage) {
    if (!confirm(`Delete stage "${stage.name}"?`)) return;
    deleteStage.mutate({ id: stage.id }, {
      onSuccess: () => { invalidate(); toast({ title: "Stage deleted" }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  const sorted = [...stages].sort((a, b) => a.position - b.position);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Manage Stages
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sorted.map((stage, idx) => (
            <div key={stage.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 group">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

              {editingId === stage.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="h-6 w-6 rounded cursor-pointer border-0 p-0 shrink-0"
                  />
                  <Input
                    className="h-7 text-sm flex-1"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={saveEdit}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: stage.color }} />
                  <span className="flex-1 text-sm font-medium truncate">{stage.name}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStage(stage, "up")} disabled={idx === 0}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStage(stage, "down")} disabled={idx === sorted.length - 1}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(stage)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => handleDelete(stage)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No stages yet. Add your first stage below.</p>
          )}
        </div>

        {/* Add new stage */}
        <div className="border-t p-4 space-y-3 bg-gray-50/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Stage</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="h-8 w-8 rounded cursor-pointer border border-gray-200 p-0 shrink-0"
              title="Pick stage color"
            />
            <Input
              className="flex-1"
              placeholder="Stage name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
            />
          </div>
          <Button
            className="w-full bg-[#118847] hover:bg-[#0e7038] gap-1"
            onClick={handleAdd}
            disabled={!newName.trim() || createStage.isPending}
          >
            <Plus className="h-4 w-4" />
            {createStage.isPending ? "Adding..." : "Add Stage"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── New Board Dialog ────────────────────────────────────────────────────────
function NewBoardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createBoard = useCreatePipelineBoard();
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#118847");

  function handleCreate() {
    if (!name.trim()) return;
    createBoard.mutate({ data: { name: name.trim(), color } }, {
      onSuccess: () => {
        toast({ title: "Board created" });
        queryClient.invalidateQueries({ queryKey: getListPipelineBoardsQueryKey() });
        setName(""); setColor("#118847");
        onOpenChange(false);
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">⊞</span> New Board
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Board Name <span className="text-red-500">*</span></Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Operations, Logistics..."
              onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Board Color</Label>
            <div className="flex flex-wrap gap-2">
              {BOARD_COLORS.map(c => (
                <button
                  key={c}
                  className={`h-8 w-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-gray-700 scale-110" : "hover:scale-105"}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-[#118847] hover:bg-[#0e7038]"
            onClick={handleCreate}
            disabled={!name.trim() || createBoard.isPending}
          >
            {createBoard.isPending ? "Creating..." : "Create Board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Draggable Card ──────────────────────────────────────────────────────────
function DraggableCard({
  company,
  stage,
  onEditClick,
}: {
  company: any;
  stage: string;
  onEditClick: (company: any) => void;
}) {
  const [, navigate] = useLocation();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(company.id),
    data: { stage, company },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
  };

  const priorityColor =
    company.priority === "urgent" ? "text-red-700 border-red-200 bg-red-50" :
    company.priority === "high" ? "text-orange-700 border-orange-200 bg-orange-50" :
    company.priority === "low" ? "text-blue-700 border-blue-200 bg-blue-50" :
    "text-yellow-700 border-yellow-200 bg-yellow-50";

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="border border-gray-200 bg-white hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Drag handle — only this element gets pointer listeners */}
            <div
              {...listeners}
              className="flex items-center justify-center w-6 shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 touch-none rounded-l-lg hover:bg-gray-50 transition-colors"
              title="Drag to move"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>

            {/* Card body — click navigates, buttons work independently */}
            <div className="flex-1 min-w-0 py-2.5 pr-2.5">
              <div className="flex items-start justify-between gap-1 mb-1">
                <button
                  className="text-sm font-semibold text-gray-900 text-left leading-snug line-clamp-2 hover:text-[#118847] transition-colors flex-1"
                  onClick={() => navigate(`/companies/${company.id}`)}
                  title="Open company details"
                >
                  {company.name}
                </button>
                <button
                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-gray-100 shrink-0 transition-colors"
                  onClick={() => onEditClick(company)}
                  title="Edit company"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>

              {company.industry && (
                <p className="text-xs text-muted-foreground mb-1.5">{company.industry}</p>
              )}

              <div className="flex items-center justify-between gap-1">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${priorityColor}`}>
                  {company.priority}
                </Badge>
                {company.expectedRevenue ? (
                  <span className="text-xs font-semibold text-[#118847]">
                    ₹{Number(company.expectedRevenue).toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </div>

              {company.ownerName && (
                <p className="text-[10px] text-muted-foreground truncate mt-1">{company.ownerName}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Droppable Column ────────────────────────────────────────────────────────
function DroppableColumn({
  stage,
  stageColor,
  count,
  totalRevenue,
  companies,
  onEditClick,
}: {
  stage: string;
  stageColor: string;
  count: number;
  totalRevenue: number;
  companies: any[];
  onEditClick: (company: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col rounded-xl border transition-colors ${
        isOver ? "bg-primary/5 border-primary/30" : "bg-gray-50/70 border-gray-200"
      }`}
      style={{ minHeight: 200 }}
    >
      <div className="p-3 border-b flex items-center justify-between bg-white/80 rounded-t-xl sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: stageColor }} />
          <h3 className="font-semibold text-sm text-gray-800 truncate">{stage}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {totalRevenue > 0 && (
            <span className="text-[10px] text-[#118847] font-medium">
              ₹{totalRevenue >= 100000 ? `${(totalRevenue / 100000).toFixed(1)}L` : totalRevenue.toLocaleString("en-IN")}
            </span>
          )}
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[80px]">
        {companies.map((company) => (
          <DraggableCard key={company.id} company={company} stage={stage} onEditClick={onEditClick} />
        ))}
        {companies.length === 0 && (
          <div className={`text-center py-8 text-xs text-muted-foreground italic rounded-lg border-2 border-dashed transition-colors ${
            isOver ? "border-primary/40 text-primary" : "border-gray-200"
          }`}>
            {isOver ? "Drop here" : "No companies"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Pipeline Page ──────────────────────────────────────────────────────
export default function Pipeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBoardId, setSelectedBoardId] = React.useState<number | null>(null);
  const [activeCompany, setActiveCompany] = React.useState<any>(null);
  const [editCompany, setEditCompany] = React.useState<any>(null);
  const [manageStagesOpen, setManageStagesOpen] = React.useState(false);
  const [newBoardOpen, setNewBoardOpen] = React.useState(false);

  // Boards
  const { data: boardsData } = useListPipelineBoards({
    query: { queryKey: getListPipelineBoardsQueryKey() },
  });
  const boards = boardsData?.data ?? [];

  // Auto-select first board
  React.useEffect(() => {
    if (boards.length > 0 && selectedBoardId === null) {
      const def = boards.find(b => b.isDefault) ?? boards[0];
      if (def) setSelectedBoardId(def.id);
    }
  }, [boards, selectedBoardId]);

  // Stages for selected board
  const { data: stagesData } = useListPipelineStages(selectedBoardId ?? 0, {
    query: {
      enabled: selectedBoardId !== null,
      queryKey: getListPipelineStagesQueryKey(selectedBoardId ?? 0),
    },
  });
  const stages = stagesData?.data ?? [];

  // Pipeline data
  const pipelineParams = selectedBoardId ? { boardId: selectedBoardId } : undefined;
  const { data, isLoading } = useGetPipeline(pipelineParams, {
    query: {
      enabled: selectedBoardId !== null,
      queryKey: getGetPipelineQueryKey(pipelineParams),
      refetchOnWindowFocus: false,
    },
  });

  const updateStage = useUpdateCompanyStage({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey(pipelineParams) });
        queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
      },
      onError: (e: any) => toast({ title: "Failed to move card", description: e.message, variant: "destructive" }),
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCompany(event.active.data.current?.company ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCompany(null);
    const { active, over } = event;
    if (!over) return;
    const companyId = parseInt(String(active.id), 10);
    const fromStage = active.data.current?.stage as string;
    const toStage = String(over.id);
    if (fromStage === toStage) return;
    updateStage.mutate({ id: companyId, data: { stage: toStage } });
  };

  const totalCompanies = data?.columns.reduce((acc, col) => acc + col.count, 0) ?? 0;
  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {totalCompanies} {totalCompanies === 1 ? "company" : "companies"} · Drag cards to move between stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setManageStagesOpen(true)}
            disabled={!selectedBoardId}
          >
            <Settings2 className="h-4 w-4" /> Manage Stages
          </Button>
          <Button
            size="sm"
            className="bg-[#118847] hover:bg-[#0e7038] gap-1.5"
            onClick={() => setNewBoardOpen(true)}
          >
            <Plus className="h-4 w-4" /> New Board
          </Button>
        </div>
      </div>

      {/* Board tabs */}
      {boards.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {boards.map(board => (
            <button
              key={board.id}
              onClick={() => setSelectedBoardId(board.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
                selectedBoardId === board.id
                  ? "text-white shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
              style={selectedBoardId === board.id ? { background: board.color, borderColor: board.color } : {}}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: selectedBoardId === board.id ? "rgba(255,255,255,0.7)" : board.color }}
              />
              {board.name}
              {board.isDefault && (
                <span className={`text-[10px] ${selectedBoardId === board.id ? "opacity-70" : "text-muted-foreground"}`}>
                  default
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto pb-4">
        {isLoading || selectedBoardId === null ? (
          <div className="flex gap-4 min-w-max">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="w-72 flex-shrink-0 flex flex-col gap-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : data?.columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Settings2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No stages yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Click "Manage Stages" to add pipeline stages</p>
            <Button className="mt-4 bg-[#118847] hover:bg-[#0e7038] gap-1" onClick={() => setManageStagesOpen(true)}>
              <Settings2 className="h-4 w-4" /> Manage Stages
            </Button>
          </div>
        ) : (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 min-w-max h-full items-start">
              {data?.columns.map((column) => (
                <DroppableColumn
                  key={column.stage}
                  stage={column.stage}
                  stageColor={column.stageColor ?? "#6b7280"}
                  count={column.count}
                  totalRevenue={column.totalRevenue}
                  companies={column.companies}
                  onEditClick={setEditCompany}
                />
              ))}
            </div>

            <DragOverlay>
              {activeCompany ? (
                <Card className="w-72 shadow-xl border-primary/20 bg-white opacity-95 cursor-grabbing">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-2">{activeCompany.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {activeCompany.industry && <p className="text-xs text-muted-foreground mb-1">{activeCompany.industry}</p>}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-muted-foreground">{activeCompany.ownerName || "Unassigned"}</span>
                      <span className="text-xs font-semibold text-[#118847]">
                        {activeCompany.expectedRevenue ? `₹${Number(activeCompany.expectedRevenue).toLocaleString("en-IN")}` : "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Modals & Panels */}
      {editCompany && (
        <CompanyEditModal
          company={editCompany}
          stages={stages}
          onClose={() => {
            setEditCompany(null);
            queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey(pipelineParams) });
          }}
        />
      )}

      {selectedBoardId && (
        <ManageStagesSheet
          open={manageStagesOpen}
          onOpenChange={setManageStagesOpen}
          boardId={selectedBoardId}
          stages={stages}
        />
      )}

      <NewBoardDialog open={newBoardOpen} onOpenChange={setNewBoardOpen} />
    </div>
  );
}
