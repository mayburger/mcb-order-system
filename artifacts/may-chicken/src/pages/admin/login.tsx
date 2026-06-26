import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminLogin, useGetAdminSession, getGetAdminSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = useAdminLogin();
  const qc = useQueryClient();

  const { data: session, isLoading } = useGetAdminSession({
    query: { queryKey: getGetAdminSessionQueryKey() }
  });

  if (!isLoading && session?.authenticated) {
    navigate("/backstage/dashboard");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    login.mutate(
      { data: { username, password } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
          navigate("/backstage/dashboard");
        },
        onError: () => setError("Ungültiger Benutzername oder Passwort"),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="text-4xl font-display font-bold uppercase tracking-tight text-white">
            MAY CHICKEN<span className="text-primary">.</span>
          </span>
          <p className="text-muted-foreground mt-2 uppercase tracking-wider text-xs">Admin-Portal</p>
        </div>

        <div className="bg-card border border-border p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-4 border border-primary/30">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Benutzername</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)}
                required autoComplete="username"
                className="rounded-none border-border bg-background text-white" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Passwort</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)}
                type="password" required autoComplete="current-password"
                className="rounded-none border-border bg-background text-white" />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={login.isPending}
              className="w-full rounded-none h-11 uppercase tracking-widest font-bold bg-primary hover:bg-primary/90 text-white">
              {login.isPending ? "Anmeldung läuft..." : "Anmelden"}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}
