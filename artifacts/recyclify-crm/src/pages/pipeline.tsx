import React from "react";
import {
  useGetPipeline, getGetPipelineQueryKey, getListCompaniesQueryKey,
  useUpdateCompanyStage, useUpdateCompany,
  useListPipelineBoards, useCreatePipelineBoard,
  useListPipelineStages, useUpdatePipelineStage,
  getListPipelineBoardsQueryKey, getListPipelineStagesQueryKey,
  type PipelineStage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable, useDraggable, closestCenter, type CollisionDetection } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
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
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Plus, Pencil, Building2, ExternalLink, GripVertical, LayoutGrid } from "lucide-react";

const BOARD_COLORS = [
  "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
  "#14b8a6", "#22c55e", "#6366f1", "#ec4899",
  "#f97316", "#06b6d4", "#a855f7", "#118847",
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
    expectedPickupDate: company.expectedPickupDate ? company.expectedPickupDate.substring(0, 7) : "",
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
        queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey() });
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
            <Input type="month" value={form.expectedPickupDate} onChange={field("expectedPickupDate")} />
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
    data: { type: "card", stage, company },
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

// ─── Sortable + Droppable Column ─────────────────────────────────────────────
function SortableColumn({
  stageId,
  stage,
  stageColor,
  count,
  totalRevenue,
  companies,
  onEditClick,
}: {
  stageId: number;
  stage: string;
  stageColor: string;
  count: number;
  totalRevenue: number;
  companies: any[];
  onEditClick: (company: any) => void;
}) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: `col-${stageId}`,
    data: { type: "column" },
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: stage,
    data: { type: "stage-dropzone" },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setSortableRef} style={style} className="w-72 flex-shrink-0">
      <div
        ref={setDroppableRef}
        className={`flex flex-col rounded-xl border transition-colors ${
          isOver ? "bg-primary/5 border-primary/30" : "bg-gray-50/70 border-gray-200"
        }`}
        style={{ minHeight: 200 }}
      >
        <div className="p-3 border-b flex items-center justify-between bg-white/80 rounded-t-xl sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 touch-none shrink-0"
              title="Drag to reorder this stage"
            >
              <GripVertical className="h-4 w-4" />
            </div>
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
    </div>
  );
}

// ─── Main Pipeline Page ──────────────────────────────────────────────────────
export default function Pipeline() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBoardId, setSelectedBoardId] = React.useState<number | null>(null);
  const [activeCompany, setActiveCompany] = React.useState<any>(null);
  const [activeColumn, setActiveColumn] = React.useState<any>(null);
  const [editCompany, setEditCompany] = React.useState<any>(null);
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
  const stagesKey = getListPipelineStagesQueryKey(selectedBoardId ?? 0);
  const { data: stagesData } = useListPipelineStages(selectedBoardId ?? 0, {
    query: {
      enabled: selectedBoardId !== null,
      queryKey: stagesKey,
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

  const updateStagePosition = useUpdatePipelineStage();

  // The column's sortable wrapper spans the whole column (so it can animate
  // as one piece while being reordered), which fully overlaps the card
  // drop-zone inside it. Without this, dnd-kit's default collision detection
  // can resolve a card drag onto the "column" target instead of the
  // "stage-dropzone" target (or vice versa for a column drag), silently
  // no-opping the drop. Restricting candidates by the active item's own type
  // removes the ambiguity regardless of DOM nesting.
  const collisionDetectionStrategy: CollisionDetection = (args) => {
    const activeType = args.active.data.current?.type;
    const wantType = activeType === "column" ? "column" : "stage-dropzone";
    const filtered = args.droppableContainers.filter((c) => c.data.current?.type === wantType);
    return closestCenter({ ...args, droppableContainers: filtered });
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "column") {
      const stageId = parseInt(String(event.active.id).replace("col-", ""), 10);
      setActiveColumn(data?.columns.find(c => c.stageId === stageId) ?? null);
    } else {
      setActiveCompany(event.active.data.current?.company ?? null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCompany(null);
    setActiveColumn(null);

    if (active.data.current?.type === "column") {
      if (!over || over.data.current?.type !== "column" || active.id === over.id || !data) return;
      const oldIndex = data.columns.findIndex(c => `col-${c.stageId}` === String(active.id));
      const newIndex = data.columns.findIndex(c => `col-${c.stageId}` === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(data.columns, oldIndex, newIndex);
      Promise.all(
        reordered.map((col, idx) =>
          col.stagePosition !== idx
            ? updateStagePosition.mutateAsync({ id: col.stageId!, data: { name: col.stage, position: idx } })
            : Promise.resolve()
        )
      ).then(() => {
        queryClient.invalidateQueries({ queryKey: getGetPipelineQueryKey(pipelineParams) });
        queryClient.invalidateQueries({ queryKey: stagesKey });
      }).catch((e: any) => toast({ title: "Failed to reorder stages", description: e.message, variant: "destructive" }));
      return;
    }

    if (!over || over.data.current?.type !== "stage-dropzone") return;
    const companyId = parseInt(String(active.id), 10);
    const fromStage = active.data.current?.stage as string;
    const toStage = String(over.id);
    if (fromStage === toStage) return;
    updateStage.mutate({ id: companyId, data: { stage: toStage } });
  };

  const totalCompanies = data?.columns.reduce((acc, col) => acc + col.count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {totalCompanies} {totalCompanies === 1 ? "company" : "companies"} · Drag cards to move between stages · Drag a stage's handle to reorder stages
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No stages on this board</p>
          </div>
        ) : (
          <DndContext collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext
              items={(data?.columns ?? []).map(c => `col-${c.stageId}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-4 min-w-max h-full items-start">
                {data?.columns.map((column) => (
                  <SortableColumn
                    key={column.stageId}
                    stageId={column.stageId!}
                    stage={column.stage}
                    stageColor={column.stageColor ?? "#6b7280"}
                    count={column.count}
                    totalRevenue={column.totalRevenue}
                    companies={column.companies}
                    onEditClick={setEditCompany}
                  />
                ))}
              </div>
            </SortableContext>

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
              ) : activeColumn ? (
                <div className="w-72 rounded-xl border bg-white shadow-xl opacity-95 p-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: activeColumn.stageColor ?? "#6b7280" }} />
                  <h3 className="font-semibold text-sm text-gray-800 truncate">{activeColumn.stage}</h3>
                  <Badge variant="secondary" className="text-xs ml-auto">{activeColumn.count}</Badge>
                </div>
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

      <NewBoardDialog open={newBoardOpen} onOpenChange={setNewBoardOpen} />
    </div>
  );
}
