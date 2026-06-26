import { useState } from "react";
import {
  useListTasks,
  getListTasksQueryKey,
  useListProjects,
  getListProjectsQueryKey,
  useListMembers,
  getListMembersQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckSquare, Plus, Trash2, Circle, Clock, CheckCircle2, Search } from "lucide-react";
import { format } from "date-fns";

const priorityConfig = {
  high: { label: "High", className: "bg-red-500/10 text-red-600 border-red-300" },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-600 border-amber-300" },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
};

const statusConfig = {
  todo: { label: "To Do", icon: Circle, className: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, className: "text-secondary" },
  done: { label: "Done", icon: CheckCircle2, className: "text-green-600" },
};

const newTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  projectId: z.coerce.number({ invalid_type_error: "Select a project" }).min(1, "Select a project"),
  assigneeId: z.coerce.number().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

type NewTaskForm = z.infer<typeof newTaskSchema>;

export default function Tasks() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const { data: tasks, isLoading } = useListTasks(
    {
      status: filterStatus !== "all" ? (filterStatus as any) : undefined,
      priority: filterPriority !== "all" ? (filterPriority as any) : undefined,
    },
    {
      query: {
        queryKey: getListTasksQueryKey({
          status: filterStatus !== "all" ? (filterStatus as any) : undefined,
          priority: filterPriority !== "all" ? (filterPriority as any) : undefined,
        }),
      },
    }
  );

  const { data: projects } = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const { data: members } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setOpen(false);
        form.reset();
      },
    },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
    },
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      },
    },
  });

  const form = useForm<NewTaskForm>({
    resolver: zodResolver(newTaskSchema),
    defaultValues: {
      title: "", description: "", status: "todo", priority: "medium",
      projectId: 0, assigneeId: null, dueDate: null,
    },
  });

  const onSubmit = (data: NewTaskForm) => {
    createTask.mutate({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        projectId: data.projectId,
        assigneeId: data.assigneeId ?? null,
        dueDate: data.dueDate ?? null,
      },
    });
  };

  const filtered = tasks?.filter((t) =>
    search === "" ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.project?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const isOverdue = (t: { status: string; dueDate?: string | null }) =>
    t.status !== "done" && t.dueDate != null && t.dueDate < new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">All Tasks</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered?.length ?? 0} tasks
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm" data-testid="button-new-task">
              <Plus className="w-4 h-4 mr-2" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="Task title" data-testid="input-task-title" {...form.register("title")} />
                {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea placeholder="Optional details" rows={2} data-testid="input-task-description" {...form.register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Project</Label>
                  <Select onValueChange={(v) => form.setValue("projectId", parseInt(v))}>
                    <SelectTrigger data-testid="select-task-project">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.projectId && <p className="text-xs text-destructive">{form.formState.errors.projectId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Assignee</Label>
                  <Select onValueChange={(v) => form.setValue("assigneeId", v ? parseInt(v) : null)}>
                    <SelectTrigger data-testid="select-task-assignee">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Unassigned</SelectItem>
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select defaultValue="todo" onValueChange={(v) => form.setValue("status", v as any)}>
                    <SelectTrigger data-testid="select-task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select defaultValue="medium" onValueChange={(v) => form.setValue("priority", v as any)}>
                    <SelectTrigger data-testid="select-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" data-testid="input-task-due-date" {...form.register("dueDate")} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createTask.isPending} data-testid="button-submit-task">
                  {createTask.isPending ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-tasks"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36" data-testid="select-filter-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/50">
          <div className="px-4 py-2.5">Task</div>
          <div className="px-4 py-2.5 w-28">Project</div>
          <div className="px-4 py-2.5 w-24">Assignee</div>
          <div className="px-4 py-2.5 w-24">Priority</div>
          <div className="px-4 py-2.5 w-24">Due Date</div>
          <div className="px-4 py-2.5 w-12"></div>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No tasks found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered?.map((task) => {
              const status = statusConfig[task.status as keyof typeof statusConfig];
              const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
              const StatusIcon = status?.icon ?? Circle;
              const overdue = isOverdue(task);

              return (
                <div
                  key={task.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-0 hover:bg-muted/40 transition-colors group"
                  data-testid={`row-task-${task.id}`}
                >
                  <div className="px-4 py-3 flex items-center gap-3 min-w-0">
                    <Select
                      value={task.status}
                      onValueChange={(v) =>
                        updateTask.mutate({ id: task.id, data: { status: v as any } })
                      }
                    >
                      <SelectTrigger className="w-auto border-none shadow-none p-0 h-auto bg-transparent hover:bg-transparent focus:ring-0">
                        <StatusIcon className={`w-4 h-4 flex-shrink-0 ${status?.className}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="px-4 py-3 w-28">
                    {task.project && (
                      <span
                        className="text-xs font-medium truncate block"
                        style={{ color: task.project.color }}
                      >
                        {task.project.name}
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 w-24 text-xs text-muted-foreground truncate">
                    {task.assignee?.name ?? <span className="italic">Unassigned</span>}
                  </div>
                  <div className="px-4 py-3 w-24">
                    {priority && (
                      <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${priority.className}`}>
                        {priority.label}
                      </Badge>
                    )}
                  </div>
                  <div className={`px-4 py-3 w-24 text-xs font-mono ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                  </div>
                  <div className="px-4 py-3 w-12">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                      onClick={() => deleteTask.mutate({ id: task.id })}
                      data-testid={`button-delete-task-${task.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
