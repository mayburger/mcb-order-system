import { useParams, Link } from "wouter";
import {
  useGetMember,
  getGetMemberQueryKey,
  useListTasks,
  getListTasksQueryKey,
  useUpdateTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Circle, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const roleConfig = {
  admin: { label: "Admin", className: "bg-primary/10 text-primary border-primary/30" },
  manager: { label: "Manager", className: "bg-secondary/10 text-secondary border-secondary/30" },
  member: { label: "Member", className: "bg-muted text-muted-foreground border-border" },
};

const statusConfig = {
  todo: { label: "To Do", icon: Circle, className: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, className: "text-secondary" },
  done: { label: "Done", icon: CheckCircle2, className: "text-green-600" },
};

const priorityConfig = {
  high: { label: "High", className: "bg-red-500/10 text-red-600 border-red-300" },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-600 border-amber-300" },
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const avatarColors = ["bg-primary", "bg-secondary", "bg-purple-500", "bg-pink-500", "bg-teal-500"];

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const memberId = parseInt(id, 10);
  const queryClient = useQueryClient();

  const { data: member, isLoading: loadingMember } = useGetMember(memberId, {
    query: { enabled: !!memberId, queryKey: getGetMemberQueryKey(memberId) },
  });

  const { data: tasks, isLoading: loadingTasks } = useListTasks(
    { assigneeId: memberId },
    {
      query: {
        enabled: !!memberId,
        queryKey: getListTasksQueryKey({ assigneeId: memberId }),
      },
    }
  );

  const updateTask = useUpdateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ assigneeId: memberId }) });
      },
    },
  });

  const isOverdue = (t: { status: string; dueDate?: string | null }) =>
    t.status !== "done" && t.dueDate != null && t.dueDate < new Date().toISOString().split("T")[0];

  if (loadingMember) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Member not found.</p>
        <Link href="/members" className="text-primary text-sm mt-2 inline-block hover:underline">
          Back to Team
        </Link>
      </div>
    );
  }

  const role = roleConfig[member.role as keyof typeof roleConfig] ?? roleConfig.member;
  const avatarColor = avatarColors[memberId % avatarColors.length];
  const activeTasks = tasks?.filter((t) => t.status !== "done") ?? [];
  const doneTasks = tasks?.filter((t) => t.status === "done") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/members" className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm" data-testid="link-back-members">
          <ArrowLeft className="w-4 h-4 mr-1" /> Team
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-xl ${avatarColor} flex items-center justify-center text-white font-bold text-lg`}>
          {getInitials(member.name)}
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{member.name}</h2>
          <p className="text-muted-foreground text-sm">{member.email}</p>
          <Badge variant="outline" className={`mt-1 text-xs px-1.5 ${role.className}`}>
            {role.label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border shadow-none bg-muted/30">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold">{tasks?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">Total Tasks</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none bg-muted/30">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-secondary">{activeTasks.length}</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">Active</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none bg-muted/30">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="text-2xl font-bold text-green-600">{doneTasks.length}</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">Done</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Assigned Tasks</h3>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {loadingTasks ? (
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></div>
              ))}
            </div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground text-sm">No tasks assigned</p>
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

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.project && (
                        <p className="text-xs mt-0.5" style={{ color: task.project.color }}>
                          {task.project.name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {priority && (
                        <Badge variant="outline" className={`text-xs px-1.5 ${priority.className} hidden md:flex`}>
                          {priority.label}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <span className={`text-xs font-mono flex items-center gap-0.5 ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                          {overdue && <AlertCircle className="w-3 h-3" />}
                          {format(new Date(task.dueDate), "MMM d")}
                        </span>
                      )}
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
