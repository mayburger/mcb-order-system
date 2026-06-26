import { useState } from "react";
import { Link } from "wouter";
import {
  useListProjects,
  getListProjectsQueryKey,
  useCreateProject,
  useDeleteProject,
  useGetProjectSummary,
  getGetProjectSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, Plus, Trash2, ArrowRight, CheckCircle2, Clock, Circle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const PROJECT_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6",
];

const newProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "archived"]),
  color: z.string(),
});

type NewProjectForm = z.infer<typeof newProjectSchema>;

function ProjectSummaryBar({ projectId }: { projectId: number }) {
  const { data } = useGetProjectSummary(projectId, {
    query: { queryKey: getGetProjectSummaryQueryKey(projectId) },
  });
  if (!data) return <div className="h-1.5 bg-muted rounded-full" />;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data.totalTasks} tasks</span>
        <span className="font-mono">{data.completionRate}% done</span>
      </div>
      <Progress value={data.completionRate} className="h-1.5" />
      <div className="flex gap-3 text-xs pt-0.5">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Circle className="w-2.5 h-2.5" /> {data.todoCount} todo
        </span>
        <span className="flex items-center gap-1 text-secondary">
          <Clock className="w-2.5 h-2.5" /> {data.inProgressCount} active
        </span>
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="w-2.5 h-2.5" /> {data.doneCount} done
        </span>
        {data.overdueCount > 0 && (
          <span className="flex items-center gap-1 text-destructive ml-auto font-medium">
            {data.overdueCount} overdue
          </span>
        )}
      </div>
    </div>
  );
}

const statusConfig = {
  active: { label: "Active", className: "bg-secondary/15 text-secondary border-secondary/30" },
  completed: { label: "Completed", className: "bg-green-500/15 text-green-600 border-green-500/30" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground border-border" },
};

export default function Projects() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);

  const { data: projects, isLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() },
  });

  const createProject = useCreateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setOpen(false);
        form.reset();
      },
    },
  });

  const deleteProject = useDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      },
    },
  });

  const form = useForm<NewProjectForm>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: { name: "", description: "", status: "active", color: PROJECT_COLORS[0] },
  });

  const onSubmit = (data: NewProjectForm) => {
    createProject.mutate({ data: { ...data, color: selectedColor } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {projects?.length ?? 0} projects total
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm" data-testid="button-new-project">
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">Project Name</Label>
                <Input id="proj-name" placeholder="e.g. API v2 Redesign" data-testid="input-project-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-desc">Description</Label>
                <Textarea id="proj-desc" placeholder="What is this project about?" rows={2} data-testid="input-project-description" {...form.register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select defaultValue="active" onValueChange={(v) => form.setValue("status", v as any)}>
                    <SelectTrigger data-testid="select-project-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${selectedColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setSelectedColor(c)}
                        data-testid={`button-color-${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createProject.isPending} data-testid="button-submit-project">
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => {
            const status = statusConfig[project.status as keyof typeof statusConfig] ?? statusConfig.active;
            return (
              <Card
                key={project.id}
                className="group hover:shadow-md transition-shadow border-border"
                data-testid={`card-project-${project.id}`}
                style={{ borderLeftColor: project.color, borderLeftWidth: 4 }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold leading-tight truncate">
                        {project.name}
                      </CardTitle>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${status.className}`}>
                        {status.label}
                      </Badge>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                        onClick={() => deleteProject.mutate({ id: project.id })}
                        data-testid={`button-delete-project-${project.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProjectSummaryBar projectId={project.id} />
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors group/link"
                    data-testid={`link-project-detail-${project.id}`}
                  >
                    View project
                    <ArrowRight className="w-3 h-3 ml-1 group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
