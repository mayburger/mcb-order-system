import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetTaskActivity,
  getGetTaskActivityQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, Clock, FolderKanban, ListTodo, Users, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: activities, isLoading: isLoadingActivity } = useGetTaskActivity({ limit: 10 }, {
    query: { queryKey: getGetTaskActivityQueryKey({ limit: 10 }) }
  });

  if (isLoadingSummary || isLoadingActivity) {
    return <div className="animate-pulse space-y-8">
      <div className="h-32 bg-muted rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-md" />)}
      </div>
    </div>;
  }

  if (!summary) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase">
            Runway Command Center • {format(new Date(), "yyyy-MM-dd HH:mm:ss")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {summary.totalProjects} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-mono text-secondary">{summary.completionRate}%</span> completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{summary.overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate action
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent-foreground shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
            <Users className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.memberCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active personnel
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Task Distribution</h3>
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-muted/50 border-none shadow-none">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-foreground">{summary.todoCount}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">To Do</div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/10 border-none shadow-none">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-secondary">{summary.inProgressCount}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary/80 mt-1">In Progress</div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/10 border-none shadow-none">
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.doneCount}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-green-600/80 mt-1">Done</div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 pt-4">
             <div className="flex items-center justify-between border-b pb-2 mb-4">
               <h3 className="text-lg font-semibold">Quick Actions</h3>
             </div>
             <div className="flex gap-4">
                <Link href="/projects" className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors text-sm shadow-sm flex items-center">
                  <FolderKanban className="w-4 h-4 mr-2" />
                  Manage Projects
                </Link>
                <Link href="/tasks" className="px-4 py-2 bg-card border border-border text-foreground font-medium rounded-md hover:bg-accent transition-colors text-sm shadow-sm flex items-center">
                  <ListTodo className="w-4 h-4 mr-2" />
                  View All Tasks
                </Link>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2 flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Activity Log
          </h3>
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {activities?.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No recent activity.
                  </div>
                )}
                {activities?.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {item.action === 'created' && <Plus className="w-4 h-4 text-blue-500" />}
                        {item.action === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        {item.action === 'updated' && <Activity className="w-4 h-4 text-orange-500" />}
                        {item.action === 'assigned' && <Users className="w-4 h-4 text-purple-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {item.taskTitle}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="capitalize">{item.action}</span> in <span className="font-medium text-foreground">{item.projectName}</span>
                          {item.assigneeName && ` • Assigned to ${item.assigneeName}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          {format(new Date(item.createdAt), "MMM d, HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
