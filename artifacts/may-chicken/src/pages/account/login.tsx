import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { useCustomerLogin, useCustomerRegister } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCustomerSessionQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, User, Phone } from "lucide-react";

export default function AccountLoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useCustomerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPassword2, setRegPassword2] = useState("");

  const loginMutation = useCustomerLogin();
  const registerMutation = useCustomerRegister();

  if (isAuthenticated) {
    navigate("/account/orders");
    return null;
  }

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    loginMutation.mutate(
      { data: { email: loginEmail, password: loginPassword } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCustomerSessionQueryKey() });
          navigate("/account/orders");
        },
        onError: () => toast({ title: "Anmeldung fehlgeschlagen", description: "E-Mail oder Passwort falsch.", variant: "destructive" }),
      }
    );
  };

  const onRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFirstName || !regEmail || !regPassword) return;
    if (regPassword !== regPassword2) {
      toast({ title: "Passwörter stimmen nicht überein", variant: "destructive" });
      return;
    }
    if (regPassword.length < 6) {
      toast({ title: "Passwort muss mindestens 6 Zeichen lang sein", variant: "destructive" });
      return;
    }
    registerMutation.mutate(
      { data: { email: regEmail, password: regPassword, firstName: regFirstName, lastName: regLastName, phone: regPhone } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCustomerSessionQueryKey() });
          navigate("/account/orders");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          toast({ title: msg ?? "Registrierung fehlgeschlagen", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold uppercase text-white">Mein Konto</h1>
          <p className="text-muted-foreground mt-2 text-sm">Bestellhistorie, Favoriten & gespeicherte Notizen</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white"
              }`}
            >
              {t === "login" ? "Anmelden" : "Registrieren"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="rounded-none border-border bg-background text-white pl-10"
                  placeholder="name@beispiel.de"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="rounded-none border-border bg-background text-white pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-none bg-primary hover:bg-primary/90 uppercase tracking-widest font-bold h-12"
            >
              {loginMutation.isPending ? "Anmelden…" : "Anmelden"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Noch kein Konto?{" "}
              <button type="button" onClick={() => setTab("register")} className="text-primary hover:underline">
                Jetzt registrieren
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={onRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Vorname *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    required
                    className="rounded-none border-border bg-background text-white pl-10"
                    placeholder="Max"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Nachname</label>
                <Input
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value)}
                  className="rounded-none border-border bg-background text-white"
                  placeholder="Mustermann"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">E-Mail *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="rounded-none border-border bg-background text-white pl-10"
                  placeholder="name@beispiel.de"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  autoComplete="tel"
                  className="rounded-none border-border bg-background text-white pl-10"
                  placeholder="+49 ..."
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Passwort *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="rounded-none border-border bg-background text-white pl-10"
                  placeholder="Min. 6 Zeichen"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Passwort wiederholen *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={regPassword2}
                  onChange={(e) => setRegPassword2(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="rounded-none border-border bg-background text-white pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded-none bg-primary hover:bg-primary/90 uppercase tracking-widest font-bold h-12"
            >
              {registerMutation.isPending ? "Registrieren…" : "Konto erstellen"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Bereits registriert?{" "}
              <button type="button" onClick={() => setTab("login")} className="text-primary hover:underline">
                Jetzt anmelden
              </button>
            </p>
          </form>
        )}
      </div>
    </Layout>
  );
}
