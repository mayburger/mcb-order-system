import { useState } from "react";
import { Link } from "wouter";
import {
  useListMembers,
  getListMembersQueryKey,
  useCreateMember,
  useDeleteMember,
  useListTasks,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Users, Plus, Trash2, ArrowRight, CheckSquare } from "lucide-react";

const roleConfig = {
  admin: { label: "Admin", className: "bg-primary/10 text-primary border-primary/30" },
  manager: { label: "Manager", className: "bg-secondary/10 text-secondary border-secondary/30" },
  member: { label: "Member", className: "bg-muted text-muted-foreground border-border" },
};

const newMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "manager", "member"]),
});

type NewMemberForm = z.infer<typeof newMemberSchema>;

function MemberTaskCount({ memberId }: { memberId: number }) {
  const { data: tasks } = useListTasks(
    { assigneeId: memberId },
    { query: { queryKey: getListTasksQueryKey({ assigneeId: memberId }) } }
  );
  const active = tasks?.filter((t) => t.status !== "done").length ?? 0;
  const done = tasks?.filter((t) => t.status === "done").length ?? 0;
  return (
    <div className="flex gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <CheckSquare className="w-3 h-3" />
        {active} active
      </span>
      <span>{done} done</span>
    </div>
  );
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Members() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: members, isLoading } = useListMembers({
    query: { queryKey: getListMembersQueryKey() },
  });

  const createMember = useCreateMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        setOpen(false);
        form.reset();
      },
    },
  });

  const deleteMember = useDeleteMember({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
    },
  });

  const form = useForm<NewMemberForm>({
    resolver: zodResolver(newMemberSchema),
    defaultValues: { name: "", email: "", role: "member" },
  });

  const onSubmit = (data: NewMemberForm) => {
    createMember.mutate({ data });
  };

  const colors = ["bg-primary", "bg-secondary", "bg-purple-500", "bg-pink-500", "bg-teal-500", "bg-orange-500"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {members?.length ?? 0} members
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm" data-testid="button-new-member">
              <Plus className="w-4 h-4 mr-2" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Full name" data-testid="input-member-name" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="name@company.com" data-testid="input-member-email" {...form.register("email")} />
                {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select defaultValue="member" onValueChange={(v) => form.setValue("role", v as any)}>
                  <SelectTrigger data-testid="select-member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMember.isPending} data-testid="button-submit-member">
                  {createMember.isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : members?.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No team members yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members?.map((member, idx) => {
            const role = roleConfig[member.role as keyof typeof roleConfig] ?? roleConfig.member;
            const avatarColor = colors[idx % colors.length];
            return (
              <Card
                key={member.id}
                className="group hover:shadow-md transition-shadow"
                data-testid={`card-member-${member.id}`}
              >
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg ${avatarColor} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {getInitials(member.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-sm truncate">{member.name}</p>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex-shrink-0"
                          onClick={() => deleteMember.mutate({ id: member.id })}
                          data-testid={`button-delete-member-${member.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${role.className}`}>
                          {role.label}
                        </Badge>
                        <Link
                          href={`/members/${member.id}`}
                          className="flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          data-testid={`link-member-detail-${member.id}`}
                        >
                          View <ArrowRight className="w-3 h-3 ml-0.5" />
                        </Link>
                      </div>
                      <div className="mt-2">
                        <MemberTaskCount memberId={member.id} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
