import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProject,
  getGetProjectQueryKey,
  useGetProjectSummary,
  getGetProjectSummaryQueryKey,
  useListTasks,
  getListTasksQueryKey,
  useListMembers,
  getListMembersQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useUpdateProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, Circle, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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
  assigneeId: z.coerce.number().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

type NewTaskForm = z.infer<typeof newTaskSchema>;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: project, isLoading: loadingProject } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) },
  });

  const { data: summary } = useGetProjectSummary(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectSummaryQueryKey(projectId) },
  });

  const { data: tasks, isLoading: loadingTasks } = useListTasks(
    {
      projectId,
      status: filterStatus !== "all" ? (filterStatus as any) : undefined,
    },
    {
      query: {
        enabled: !!projectId,
        queryKey: getListTasksQueryKey({
          projectId,
          status: filterStatus !== "all" ? (filterStatus as any) : undefined,
        }),
      },
    }
  );

  const { data: members } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });

  const createTask = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProjectSummaryQueryKey(projectId) });
        setOpen(false);
        form.reset();
      },
    },
  });

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProjectSummaryQueryKey(projectId) });
      },
    },
  });

  const deleteTask = useDeleteTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProjectSummaryQueryKey(projectId) });
      },
    },
  });

  const updateProject = useUpdateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      },
    },
  });

  const form = useForm<NewTaskForm>({
    resolver: zodResolver(newTaskSchema),
    defaultValues: { title: "", description: "", status: "todo", priority: "medium", assigneeId: null, dueDate: null },
  });

  const onSubmit = (data: NewTaskForm) => {
    createTask.mutate({
      data: {
        ...data,
        projectId,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
      },
    });
  };

  const isOverdue = (t: { status: string; dueDate?: string | null }) =>
    t.status !== "done" && t.dueDate != null && t.dueDate < new Date().toISOString().split("T")[0];

  if (loadingProject) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Project not found.</p>
        <Link href="/projects" className="text-primary text-sm mt-2 inline-block hover:underline">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm" data-testid="link-back-projects">
          <ArrowLeft className="w-4 h-4 mr-1" /> Projects
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-10 rounded-sm flex-shrink-0" style={{ backgroundColor: project.color }} />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
            {project.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={project.status}
            onValueChange={(v) =>
              updateProject.mutate({ id: project.id, data: { status: v as any } })
            }
          >
            <SelectTrigger className="w-36 text-xs" data-testid="select-project-status-update">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: summary.totalTasks, color: "text-foreground" },
            { label: "To Do", value: summary.todoCount, color: "text-muted-foreground" },
            { label: "In Progress", value: summary.inProgressCount, color: "text-secondary" },
            { label: "Done", value: summary.doneCount, color: "text-green-600" },
            { label: "Overdue", value: summary.overdueCount, color: "text-destructive" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="border-border shadow-none bg-muted/30">
              <CardContent className="pt-4 pb-3 px-4">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
          <div className="col-span-2 md:col-span-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span className="font-mono font-medium">{summary.completionRate}%</span>
            </div>
            <Progress value={summary.completionRate} className="h-2" />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Tasks</h3>
            <div className="flex gap-1">
              {["all", "todo", "in_progress", "done"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterStatus === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                  data-testid={`button-filter-${s}`}
                >
                  {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-sm" data-testid="button-new-task">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Task to {project.name}</DialogTitle>
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
                    {createTask.isPending ? "Adding..." : "Add Task"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {loadingTasks ? (
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => <div key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></div>)}
            </div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">No tasks {filterStatus !== "all" ? `with status "${filterStatus}"` : "yet"}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tasks?.map((task) => {
                const status = statusConfig[task.status as keyof typeof statusConfig];
                const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
                const StatusIcon = status?.icon ?? Circle;
                const overdue = isOverdue(task);

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                    data-testid={`row-task-${task.id}`}
                  >
                    <Select
                      value={task.status}
                      onValueChange={(v) => updateTask.mutate({ id: task.id, data: { status: v as any } })}
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

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      {task.assignee && (
                        <span className="text-muted-foreground hidden md:block">{task.assignee.name}</span>
                      )}
                      {priority && (
                        <Badge variant="outline" className={`${priority.className} hidden md:flex`}>
                          {priority.label}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <span className={`font-mono ${overdue ? "text-destructive font-semibold flex items-center gap-0.5" : "text-muted-foreground"}`}>
                          {overdue && <AlertCircle className="w-3 h-3" />}
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
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
    </div>
  );
}
