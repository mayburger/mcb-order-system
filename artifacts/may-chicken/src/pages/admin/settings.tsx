import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetRestaurantInfo, getGetRestaurantInfoQueryKey,
  useUpdateAdminSettings,
  useGetAdminSession, getGetAdminSessionQueryKey
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Settings, Lock } from "lucide-react";

export default function AdminSettings() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: info, isLoading } = useGetRestaurantInfo({ query: { queryKey: getGetRestaurantInfoQueryKey() } });
  const updateSettings = useUpdateAdminSettings();

  const [form, setForm] = useState({ restaurantName: "", tagline: "", address: "", phone: "", email: "" });
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (info) setForm({ restaurantName: info.name ?? "", tagline: info.tagline ?? "", address: info.address ?? "", phone: info.phone ?? "", email: info.email ?? "" });
  }, [info]);

  if (!sl && !session?.authenticated) { navigate("/admin"); return null; }

  const handleSaveInfo = () => {
    updateSettings.mutate(
      { data: form },
      {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getGetRestaurantInfoQueryKey() }); toast({ title: "Einstellungen gespeichert" }); },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  const handleChangePassword = () => {
    setPwError("");
    if (!pwForm.newPassword) { setPwError("Neues Passwort erforderlich"); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError("Passwörter stimmen nicht überein"); return; }
    updateSettings.mutate(
      { data: { adminPassword: pwForm.newPassword } },
      {
        onSuccess: () => { toast({ title: "Passwort geändert" }); setPwForm({ newPassword: "", confirmPassword: "" }); },
        onError: () => { setPwError("Passwort konnte nicht geändert werden"); },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Einstellungen</h1>
        <p className="text-muted-foreground mt-1">Restaurant-Daten konfigurieren.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card border border-border animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold uppercase text-white">Restaurant-Daten</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Restaurantname", key: "restaurantName" as const },
                { label: "Slogan", key: "tagline" as const },
                { label: "Telefon", key: "phone" as const },
                { label: "E-Mail", key: "email" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
                  <Input value={form[key]} className="rounded-none border-border bg-background text-white"
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Adresse</label>
                <Input value={form.address} className="rounded-none border-border bg-background text-white"
                  onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <Button className="mt-6 rounded-none uppercase tracking-wider font-bold bg-primary hover:bg-primary/90"
              onClick={handleSaveInfo} disabled={updateSettings.isPending}>
              Änderungen speichern
            </Button>
          </div>

          <div className="bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold uppercase text-white">Passwort ändern</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: "Neues Passwort", key: "newPassword" as const },
                { label: "Passwort bestätigen", key: "confirmPassword" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
                  <Input type="password" value={pwForm[key]} className="rounded-none border-border bg-background text-white"
                    onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })} />
                </div>
              ))}
              {pwError && <p className="text-destructive text-sm">{pwError}</p>}
              <Button className="rounded-none uppercase tracking-wider font-bold bg-primary hover:bg-primary/90"
                onClick={handleChangePassword} disabled={updateSettings.isPending}>
                Passwort aktualisieren
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
