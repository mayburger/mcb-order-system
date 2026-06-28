import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ROLES, ROLE_LABELS, type Role } from "@workspace/authz";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  UserPlus,
  ShieldCheck,
  KeyRound,
  UserCheck,
  UserX,
  Save,
  X,
} from "lucide-react";

const selectClass =
  "rounded-none border border-border bg-background text-white text-sm px-2 py-1.5 focus:outline-none focus:border-primary";

export default function AdminUsers() {
  const qc = useQueryClient();
  const { session } = useAdminAuth();
  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("kasse");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [resetFor, setResetFor] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newUsername.trim().length < 3) {
      setFeedback({ ok: false, msg: "Benutzername: mindestens 3 Zeichen." });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ ok: false, msg: "Passwort: mindestens 8 Zeichen." });
      return;
    }
    createUser.mutate(
      { data: { username: newUsername.trim(), password: newPassword, role: newRole } },
      {
        onSuccess: () => {
          invalidate();
          setNewUsername("");
          setNewPassword("");
          setNewRole("kasse");
          setFeedback({ ok: true, msg: "Benutzer wurde erstellt." });
        },
        onError: () =>
          setFeedback({
            ok: false,
            msg: "Benutzer konnte nicht erstellt werden (Name bereits vergeben?).",
          }),
      },
    );
  };

  const changeRole = (id: number, role: Role) => {
    setFeedback(null);
    updateUser.mutate(
      { id, data: { role } },
      {
        onSuccess: () => {
          invalidate();
          setFeedback({ ok: true, msg: "Rolle aktualisiert." });
        },
        onError: () =>
          setFeedback({ ok: false, msg: "Rolle konnte nicht geändert werden." }),
      },
    );
  };

  const toggleActive = (id: number, active: boolean) => {
    setFeedback(null);
    updateUser.mutate(
      { id, data: { active: !active } },
      {
        onSuccess: () => {
          invalidate();
          setFeedback({
            ok: true,
            msg: active ? "Benutzer deaktiviert." : "Benutzer aktiviert.",
          });
        },
        onError: () =>
          setFeedback({
            ok: false,
            msg: "Status konnte nicht geändert werden (letzter Inhaber?).",
          }),
      },
    );
  };

  const submitReset = (id: number) => {
    setFeedback(null);
    if (resetPw.length < 8) {
      setFeedback({ ok: false, msg: "Neues Passwort: mindestens 8 Zeichen." });
      return;
    }
    updateUser.mutate(
      { id, data: { password: resetPw } },
      {
        onSuccess: () => {
          invalidate();
          setResetFor(null);
          setResetPw("");
          setFeedback({
            ok: true,
            msg: "Passwort zurückgesetzt. Der Benutzer muss es bei der nächsten Anmeldung ändern.",
          });
        },
        onError: () =>
          setFeedback({ ok: false, msg: "Passwort konnte nicht zurückgesetzt werden." }),
      },
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold uppercase text-white">
          Benutzer &amp; Rollen
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Mitarbeiterkonten anlegen, Rollen vergeben und Zugänge verwalten.
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-4 p-3 text-sm border ${
            feedback.ok
              ? "border-green-500/40 bg-green-500/10 text-green-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Create user */}
      <div className="bg-card border border-border p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold uppercase text-white text-sm tracking-wider">
            Neuen Benutzer anlegen
          </h2>
        </div>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Benutzername
            </label>
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="rounded-none border-border bg-background text-white"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Passwort
            </label>
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              className="rounded-none border-border bg-background text-white"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
              Rolle
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className={`${selectClass} w-full`}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            disabled={createUser.isPending}
            className="rounded-none h-10 uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-white"
          >
            {createUser.isPending ? "..." : "Anlegen"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-3">
          Neue Benutzer müssen ihr Passwort bei der ersten Anmeldung ändern.
        </p>
      </div>

      {/* User list */}
      <div className="bg-card border border-border">
        <div className="flex items-center gap-2 p-5 border-b border-border">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold uppercase text-white text-sm tracking-wider">
            Alle Benutzer
          </h2>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm p-6">Wird geladen...</p>
        ) : !users || users.length === 0 ? (
          <p className="text-muted-foreground text-sm p-6">
            Keine Benutzer vorhanden.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => {
              const isSelf = session?.username === u.username;
              return (
                <div key={u.id} className="p-4 md:px-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-white font-medium flex items-center gap-2">
                        {u.username}
                        {isSelf && (
                          <span className="text-[10px] text-primary uppercase tracking-wider border border-primary/40 px-1.5 py-0.5">
                            Du
                          </span>
                        )}
                      </p>
                      <p className="text-xs mt-0.5">
                        {u.active ? (
                          <span className="text-green-400 inline-flex items-center gap-1">
                            <UserCheck className="h-3 w-3" /> Aktiv
                          </span>
                        ) : (
                          <span className="text-muted-foreground inline-flex items-center gap-1">
                            <UserX className="h-3 w-3" /> Inaktiv
                          </span>
                        )}
                        {u.mustChangePassword && (
                          <span className="text-yellow-400 ml-3">
                            Passwortänderung ausstehend
                          </span>
                        )}
                      </p>
                    </div>

                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      disabled={updateUser.isPending}
                      className={selectClass}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResetFor(resetFor === u.id ? null : u.id);
                        setResetPw("");
                      }}
                      className="rounded-none text-muted-foreground hover:text-white"
                    >
                      <KeyRound className="h-4 w-4 mr-1" />
                      Passwort
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isSelf || updateUser.isPending}
                      onClick={() => toggleActive(u.id, u.active)}
                      className={`rounded-none ${
                        u.active
                          ? "text-destructive hover:text-destructive"
                          : "text-green-400 hover:text-green-300"
                      }`}
                    >
                      {u.active ? "Deaktivieren" : "Aktivieren"}
                    </Button>
                  </div>

                  {resetFor === u.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={resetPw}
                        onChange={(e) => setResetPw(e.target.value)}
                        type="password"
                        placeholder="Neues Passwort (min. 8 Zeichen)"
                        className="rounded-none border-border bg-background text-white max-w-xs"
                        autoComplete="new-password"
                      />
                      <Button
                        size="sm"
                        onClick={() => submitReset(u.id)}
                        disabled={updateUser.isPending}
                        className="rounded-none bg-primary hover:bg-primary/90 text-white"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Speichern
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setResetFor(null);
                          setResetPw("");
                        }}
                        className="rounded-none text-muted-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
