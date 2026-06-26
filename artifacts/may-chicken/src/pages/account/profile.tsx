import { useState } from "react";
import { AccountLayout } from "./layout";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { useUpdateCustomerProfile, getGetCustomerSessionQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Calendar, Pencil, Check, X } from "lucide-react";

export default function AccountProfilePage() {
  const { customer, isLoading } = useCustomerAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateCustomerProfile();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const startEdit = () => {
    setFirstName(customer?.firstName ?? "");
    setLastName(customer?.lastName ?? "");
    setPhone(customer?.phone ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = () => {
    if (!firstName.trim()) {
      toast({ title: "Vorname ist erforderlich", variant: "destructive" });
      return;
    }
    updateProfile.mutate(
      { data: { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCustomerSessionQueryKey() });
          setEditing(false);
          toast({ title: "Profil aktualisiert" });
        },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <AccountLayout>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card border border-border animate-pulse" />
          ))}
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="space-y-6 max-w-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold uppercase text-white">Meine Daten</h2>
          {!editing && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-none border-border gap-2 text-xs uppercase tracking-wider"
              onClick={startEdit}
            >
              <Pencil className="h-3 w-3" />
              Bearbeiten
            </Button>
          )}
        </div>

        {/* Profile card */}
        <div className="bg-card border border-border">
          {/* Avatar strip */}
          <div className="bg-primary/10 border-b border-border px-6 py-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">
                {customer?.firstName} {customer?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{customer?.email}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="p-6 space-y-5">
            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">
                      Vorname *
                    </label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="rounded-none border-border bg-background text-white"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">
                      Nachname
                    </label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="rounded-none border-border bg-background text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold block mb-1">
                    Telefon
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    className="rounded-none border-border bg-background text-white"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-none border-border gap-2"
                    onClick={cancelEdit}
                  >
                    <X className="h-4 w-4" />
                    Abbrechen
                  </Button>
                  <Button
                    className="flex-1 rounded-none bg-primary hover:bg-primary/90 gap-2"
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                  >
                    <Check className="h-4 w-4" />
                    {updateProfile.isPending ? "Speichern…" : "Speichern"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Field icon={<User className="h-4 w-4" />} label="Name">
                  {`${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim() || "—"}
                </Field>
                <Field icon={<Mail className="h-4 w-4" />} label="E-Mail">
                  {customer?.email ?? "—"}
                  <span className="ml-2 text-xs text-muted-foreground">(nicht änderbar)</span>
                </Field>
                <Field icon={<Phone className="h-4 w-4" />} label="Telefon">
                  {customer?.phone || <span className="text-muted-foreground italic">Nicht angegeben</span>}
                </Field>
                <Field icon={<Calendar className="h-4 w-4" />} label="Mitglied seit">
                  {customer?.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </Field>
              </>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-secondary/20 border border-border p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-white text-xs uppercase tracking-widest mb-2">Datenschutz</p>
          <p>Deine Daten werden ausschließlich für Bestellungen und Kontakt verwendet.</p>
          <p>E-Mail-Adresse kann derzeit nicht geändert werden. Kontaktiere uns bei Bedarf direkt.</p>
        </div>
      </div>
    </AccountLayout>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-0.5">{label}</p>
        <p className="text-sm text-white">{children}</p>
      </div>
    </div>
  );
}
