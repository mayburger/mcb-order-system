import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetRestaurantInfo, getGetRestaurantInfoQueryKey,
  useGetAdminSettings, getGetAdminSettingsQueryKey,
  useUpdateAdminSettings,
  useGetAdminSession, getGetAdminSessionQueryKey
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Settings, Lock, Archive } from "lucide-react";

export default function AdminSettings() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: info, isLoading } = useGetRestaurantInfo({ query: { queryKey: getGetRestaurantInfoQueryKey() } });
  const { data: settings } = useGetAdminSettings({ query: { queryKey: getGetAdminSettingsQueryKey() } });
  const updateSettings = useUpdateAdminSettings();

  const [form, setForm] = useState({ restaurantName: "", tagline: "", address: "", phone: "", email: "" });
  const [pwForm, setPwForm] = useState({ newPassword: "", confirmPassword: "" });
  const [pwError, setPwError] = useState("");
  const [retention, setRetention] = useState({
    ordersAutoArchiveEnabled: false,
    ordersAutoArchiveMonths: 6,
    ordersArchiveAutoDeleteEnabled: false,
    ordersArchiveAutoDeleteYears: 2,
  });

  useEffect(() => {
    if (info) setForm({ restaurantName: info.name ?? "", tagline: info.tagline ?? "", address: info.address ?? "", phone: info.phone ?? "", email: info.email ?? "" });
  }, [info]);

  useEffect(() => {
    if (settings) setRetention({
      ordersAutoArchiveEnabled: settings.ordersAutoArchiveEnabled ?? false,
      ordersAutoArchiveMonths: settings.ordersAutoArchiveMonths ?? 6,
      ordersArchiveAutoDeleteEnabled: settings.ordersArchiveAutoDeleteEnabled ?? false,
      ordersArchiveAutoDeleteYears: settings.ordersArchiveAutoDeleteYears ?? 2,
    });
  }, [settings]);

  if (!sl && !session?.authenticated) { navigate("/backstage"); return null; }

  const handleSaveInfo = () => {
    updateSettings.mutate(
      { data: form },
      {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getGetRestaurantInfoQueryKey() }); toast({ title: "Einstellungen gespeichert" }); },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  const handleSaveRetention = () => {
    updateSettings.mutate(
      { data: retention },
      {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() }); toast({ title: "Aufbewahrung gespeichert" }); },
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

          {/* ── Bestellungen aufbewahren ──────────────────────────────── */}
          <div className="bg-card border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold uppercase text-white">Aufbewahrung von Bestellungen</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Lege fest, ob abgeschlossene Bestellungen automatisch archiviert und das Archiv automatisch geleert wird.
              Ist die automatische Löschung deaktiviert, werden Bestellungen niemals automatisch gelöscht.
            </p>

            <div className="space-y-5">
              {/* Auto-archive */}
              <div className="border border-border p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-primary"
                    checked={retention.ordersAutoArchiveEnabled}
                    onChange={(e) => setRetention({ ...retention, ordersAutoArchiveEnabled: e.target.checked })} />
                  <span>
                    <span className="text-sm font-semibold text-white block">Bestellungen automatisch archivieren</span>
                    <span className="text-xs text-muted-foreground">Abgeschlossene/stornierte Bestellungen nach einer bestimmten Zeit ins Archiv verschieben.</span>
                  </span>
                </label>
                <div className={`flex items-center gap-2 mt-3 pl-7 ${retention.ordersAutoArchiveEnabled ? "" : "opacity-40 pointer-events-none"}`}>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Nach</span>
                  <Input type="number" min={1} value={retention.ordersAutoArchiveMonths}
                    className="rounded-none border-border bg-background text-white w-20 text-center"
                    onChange={(e) => setRetention({ ...retention, ordersAutoArchiveMonths: Math.max(1, Number(e.target.value) || 1) })} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Monaten</span>
                </div>
              </div>

              {/* Auto-delete archive */}
              <div className="border border-border p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-primary"
                    checked={retention.ordersArchiveAutoDeleteEnabled}
                    onChange={(e) => setRetention({ ...retention, ordersArchiveAutoDeleteEnabled: e.target.checked })} />
                  <span>
                    <span className="text-sm font-semibold text-white block">Archiv automatisch löschen</span>
                    <span className="text-xs text-muted-foreground">Archivierte Bestellungen nach einer bestimmten Zeit endgültig löschen. (optional)</span>
                  </span>
                </label>
                <div className={`flex items-center gap-2 mt-3 pl-7 ${retention.ordersArchiveAutoDeleteEnabled ? "" : "opacity-40 pointer-events-none"}`}>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Nach</span>
                  <Input type="number" min={1} value={retention.ordersArchiveAutoDeleteYears}
                    className="rounded-none border-border bg-background text-white w-20 text-center"
                    onChange={(e) => setRetention({ ...retention, ordersArchiveAutoDeleteYears: Math.max(1, Number(e.target.value) || 1) })} />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Jahren</span>
                </div>
              </div>
            </div>

            <Button className="mt-6 rounded-none uppercase tracking-wider font-bold bg-primary hover:bg-primary/90"
              onClick={handleSaveRetention} disabled={updateSettings.isPending}>
              Aufbewahrung speichern
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
