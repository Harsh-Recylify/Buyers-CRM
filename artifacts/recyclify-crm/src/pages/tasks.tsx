import React from "react";
import {
  useListTasks, getListTasksQueryKey,
  useCreateTask, useUpdateTask, useDeleteTask,
  useListUsers, getListUsersQueryKey,
  useListCompanies, getListCompaniesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, CheckSquare, Clock, CircleDot, MoreHorizontal,
  Pencil, Trash2, User, Calendar, Flag, Filter, ChevronDown,
  AlertCircle,
} from "lucide-react";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["todo", "in_progress", "done"] as const;

type Priority = typeof PRIORITIES[number];
type Status = typeof STATUSES[number];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  low:    { label: "Low",    color: "text-blue-700 border-blue-200 bg-blue-50",   icon: "🔵" },
  medium: { label: "Medium", color: "text-yellow-700 border-yellow-200 bg-yellow-50", icon: "🟡" },
  high:   { label: "High",   color: "text-orange-700 border-orange-200 bg-orange-50", icon: "🟠" },
  urgent: { label: "Urgent", color: "text-red-700 border-red-200 bg-red-50",     icon: "🔴" },
};

const STATUS_CONFIG: Record<Status, { label: string; icon: React.ReactNode; headerColor: string }> = {
  todo:        { label: "To Do",       icon: <CircleDot className="h-4 w-4 text-gray-500" />,     headerColor: "border-t-gray-300" },
  in_progress: { label: "In Progress", icon: <Clock className="h-4 w-4 text-blue-500" />,         headerColor: "border-t-blue-400" },
  done:        { label: "Done",        icon: <CheckSquare className="h-4 w-4 text-green-500" />,  headerColor: "border-t-green-500" },
};

type TaskForm = {
  title: string;
  description: string;
  priority: string;
  assignedToId: string;
  dueDate: string;
  reminderAt: string;
  entityType: string;
  entityId: string;
};

const emptyForm = (): TaskForm => ({
  title: "", description: "", priority: "medium",
  assignedToId: "", dueDate: "", reminderAt: "",
  entityType: "", entityId: "",
});

// ─── Create / Edit Modal ─────────────────────────────────────────────────────
function TaskFormModal({
  open,
  onOpenChange,
  initialForm,
  onSubmit,
  isPending,
  isEdit,
  users,
  companies,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialForm: TaskForm;
  onSubmit: (form: TaskForm) => void;
  isPending: boolean;
  isEdit: boolean;
  users: any[];
  companies: any[];
}) {
  const [form, setForm] = React.useState<TaskForm>(initialForm);

  React.useEffect(() => {
    if (open) setForm(initialForm);
  }, [open, initialForm]);

  function field(key: keyof TaskForm) {
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
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Edit Task" : "Create Task"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Task Title <span className="text-red-500">*</span></Label>
            <Input
              value={form.title}
              onChange={field("title")}
              placeholder="e.g. Schedule site inspection for Infosys"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={field("description")}
              placeholder="Add more context or steps..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-1.5 capitalize">
                        {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Select value={form.assignedToId} onValueChange={v => setForm(f => ({ ...f, assignedToId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={field("dueDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Reminder</Label>
              <Input type="datetime-local" value={form.reminderAt} onChange={field("reminderAt")} />
            </div>
          </div>

          <div className="space-y-3 pt-1 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Link to Company (optional)</p>
            <Select value={form.entityType} onValueChange={v => setForm(f => ({ ...f, entityType: v, entityId: "" }))}>
              <SelectTrigger>
                <SelectValue placeholder="No link" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No link</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>

            {form.entityType === "company" && (
              <Select value={form.entityId} onValueChange={v => setForm(f => ({ ...f, entityId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#118847] hover:bg-[#0e7038]" disabled={isPending || !form.title.trim()}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────────────
function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: any;
  onEdit: (task: any) => void;
  onDelete: (task: any) => void;
  onStatusChange: (task: any, status: string) => void;
}) {
  const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
  const pCfg = PRIORITY_CONFIG[task.priority as Priority] ?? PRIORITY_CONFIG.medium;

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-sm transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug flex-1 ${task.status === "done" ? "line-through text-muted-foreground" : "text-gray-900"}`}>
            {task.title}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-6 w-6 p-0 shrink-0 text-muted-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {STATUSES.filter(s => s !== task.status).map(s => (
                <DropdownMenuItem key={s} onClick={() => onStatusChange(task, s)}>
                  <span className="mr-2">{STATUS_CONFIG[s].icon}</span>
                  Move to {STATUS_CONFIG[s].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pCfg.color}`}>
            {pCfg.icon} {pCfg.label}
          </Badge>

          {task.assignedToName && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
              <User className="h-2.5 w-2.5" />
              {task.assignedToName}
            </Badge>
          )}

          {task.entityName && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-700 border-purple-200 bg-purple-50">
              {task.entityName}
            </Badge>
          )}
        </div>

        {task.dueDate && (
          <div className={`flex items-center gap-1 text-[10px] ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            {isOverdue ? "Overdue · " : "Due "}
            {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Tasks Page ─────────────────────────────────────────────────────────
export default function Tasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterAssignee, setFilterAssignee] = React.useState("all");
  const [filterPriority, setFilterPriority] = React.useState("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTask, setEditTask] = React.useState<any>(null);
  const [deleteTask, setDeleteTask] = React.useState<any>(null);

  const listParams = {
    ...(filterAssignee !== "all" && { assignedTo: parseInt(filterAssignee) }),
    ...(filterPriority !== "all" && { priority: filterPriority }),
    limit: 200,
  };
  const queryKey = getListTasksQueryKey(listParams);

  const { data, isLoading } = useListTasks(listParams, { query: { queryKey } });
  const tasks = data?.data ?? [];

  const { data: usersData } = useListUsers({}, { query: { queryKey: getListUsersQueryKey({}) } });
  const users = usersData?.data ?? [];

  const { data: companiesData } = useListCompanies({ limit: 200 }, { query: { queryKey: getListCompaniesQueryKey({ limit: 200 }) } });
  const companies = companiesData?.data ?? [];

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  }

  function buildPayload(form: TaskForm) {
    return {
      title: form.title.trim(),
      ...(form.description && { description: form.description }),
      priority: form.priority,
      ...(form.assignedToId && form.assignedToId !== "none" && { assignedToId: parseInt(form.assignedToId) }),
      ...(form.dueDate && { dueDate: form.dueDate }),
      ...(form.reminderAt && { reminderAt: form.reminderAt }),
      ...(form.entityType && form.entityType !== "none" && { entityType: form.entityType }),
      ...(form.entityId && form.entityType !== "none" && { entityId: parseInt(form.entityId) }),
    };
  }

  function handleCreate(form: TaskForm) {
    createTask.mutate({ data: buildPayload(form) }, {
      onSuccess: () => {
        toast({ title: "Task created" });
        setCreateOpen(false);
        invalidate();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function handleEdit(form: TaskForm) {
    if (!editTask) return;
    updateTask.mutate({ id: editTask.id, data: buildPayload(form) }, {
      onSuccess: () => {
        toast({ title: "Task updated" });
        setEditTask(null);
        invalidate();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function handleStatusChange(task: any, status: string) {
    updateTask.mutate({ id: task.id, data: { status } }, {
      onSuccess: () => invalidate(),
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function handleDelete() {
    if (!deleteTask) return;
    deleteTaskMutation.mutate({ id: deleteTask.id }, {
      onSuccess: () => {
        toast({ title: "Task deleted" });
        setDeleteTask(null);
        invalidate();
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  }

  function editFormFrom(task: any): TaskForm {
    return {
      title: task.title ?? "",
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      assignedToId: task.assignedToId ? String(task.assignedToId) : "",
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
      reminderAt: task.reminderAt ? task.reminderAt.substring(0, 16) : "",
      entityType: task.entityType ?? "",
      entityId: task.entityId ? String(task.entityId) : "",
    };
  }

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {} as Record<Status, any[]>);

  const totalTasks = tasks.length;
  const doneTasks = tasksByStatus.done.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {doneTasks}/{totalTasks} completed
            {totalTasks > 0 && (
              <span className="ml-2 text-[#118847] font-medium">
                ({Math.round((doneTasks / totalTasks) * 100)}%)
              </span>
            )}
          </p>
        </div>
        <Button className="bg-[#118847] hover:bg-[#0e7038] gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border rounded-xl px-4 py-3 shadow-sm">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground font-medium">Filter:</span>

        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="h-8 w-44 text-sm gap-1">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="All members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {users.map((u: any) => (
              <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-40 text-sm gap-1">
            <Flag className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map(p => (
              <SelectItem key={p} value={p}>
                {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterAssignee !== "all" || filterPriority !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setFilterAssignee("all"); setFilterPriority("all"); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Kanban columns */}
      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map(status => {
          const cfg = STATUS_CONFIG[status];
          const statusTasks = tasksByStatus[status];

          return (
            <div
              key={status}
              className={`flex flex-col bg-gray-50/60 rounded-xl border-t-4 border border-gray-200 ${cfg.headerColor}`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white/70 rounded-tl-xl rounded-tr-xl">
                <div className="flex items-center gap-2">
                  {cfg.icon}
                  <span className="font-semibold text-sm text-gray-800">{cfg.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{statusTasks.length}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-[#118847]"
                    onClick={() => setCreateOpen(true)}
                    title="Add task"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-2 min-h-[120px]">
                {isLoading ? (
                  Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                ) : statusTasks.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-xs text-muted-foreground italic">No tasks here</p>
                  </div>
                ) : (
                  statusTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={t => setEditTask(t)}
                      onDelete={t => setDeleteTask(t)}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <TaskFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialForm={emptyForm()}
        onSubmit={handleCreate}
        isPending={createTask.isPending}
        isEdit={false}
        users={users}
        companies={companies}
      />

      {/* Edit Modal */}
      {editTask && (
        <TaskFormModal
          open={!!editTask}
          onOpenChange={v => { if (!v) setEditTask(null); }}
          initialForm={editFormFrom(editTask)}
          onSubmit={handleEdit}
          isPending={updateTask.isPending}
          isEdit={true}
          users={users}
          companies={companies}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTask} onOpenChange={v => { if (!v) setDeleteTask(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTask?.title}" will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
