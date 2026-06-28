import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useChangePassword,
  getGetAdminSessionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { landingPathForRole, isRole } from "@workspace/authz";

export default function ChangePasswordPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { role, mustChangePassword } = useAdminAuth();
  const changePw = useChangePassword();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 8) {
      setError("Das neue Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    if (next !== confirm) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    changePw.mutate(
      { data: { currentPassword: current, newPassword: next } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
          navigate(isRole(role) ? landingPathForRole(role) : "/backstage/dashboard");
        },
        onError: () => setError("Das aktuelle Passwort ist nicht korrekt."),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="text-4xl font-display font-bold uppercase tracking-tight text-white">
            MAY CHICKEN<span className="text-primary">.</span>
          </span>
          <p className="text-muted-foreground mt-2 uppercase tracking-wider text-xs">
            Passwort ändern
          </p>
        </div>

        <div className="bg-card border border-border p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-4 border border-primary/30">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
          </div>

          {mustChangePassword && (
            <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 p-3 mb-4">
              Aus Sicherheitsgründen musst du dein Passwort ändern, bevor du
              fortfahren kannst.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Aktuelles Passwort
              </label>
              <Input
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                type="password"
                required
                autoComplete="current-password"
                className="rounded-none border-border bg-background text-white"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Neues Passwort
              </label>
              <Input
                value={next}
                onChange={(e) => setNext(e.target.value)}
                type="password"
                required
                autoComplete="new-password"
                className="rounded-none border-border bg-background text-white"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Neues Passwort bestätigen
              </label>
              <Input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                required
                autoComplete="new-password"
                className="rounded-none border-border bg-background text-white"
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              type="submit"
              disabled={changePw.isPending}
              className="w-full rounded-none h-11 uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-white"
            >
              {changePw.isPending ? "Wird gespeichert..." : "Passwort ändern"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
