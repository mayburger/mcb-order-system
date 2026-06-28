import { AdminLayout } from "@/components/admin-layout";
import {
  useListActivityLog,
  getListActivityLogQueryKey,
} from "@workspace/api-client-react";
import { ScrollText } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  order_deleted: "Bestellung gelöscht",
  price_changed: "Preis geändert",
  product_deactivated: "Produkt deaktiviert",
  coupon_created: "Gutschein erstellt",
  user_created: "Benutzer erstellt",
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminActivityLog() {
  const { data: entries, isLoading } = useListActivityLog({
    query: { queryKey: getListActivityLogQueryKey() },
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold uppercase text-white">
          Aktivitätsprotokoll
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Wichtige Aktionen im System – wer was wann gemacht hat.
        </p>
      </div>

      <div className="bg-card border border-border">
        <div className="flex items-center gap-2 p-5 border-b border-border">
          <ScrollText className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold uppercase text-white text-sm tracking-wider">
            Letzte Ereignisse
          </h2>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm p-6">Wird geladen...</p>
        ) : !entries || entries.length === 0 ? (
          <p className="text-muted-foreground text-sm p-6">
            Noch keine Einträge vorhanden.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground uppercase text-xs tracking-wider border-b border-border">
                  <th className="px-5 py-3 font-medium">Zeitpunkt</th>
                  <th className="px-5 py-3 font-medium">Benutzer</th>
                  <th className="px-5 py-3 font-medium">Aktion</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className="text-white">
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {formatTime(e.createdAt)}
                    </td>
                    <td className="px-5 py-3">{e.username ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block bg-primary/10 border border-primary/30 text-primary px-2 py-0.5 text-xs uppercase tracking-wider">
                        {ACTION_LABELS[e.action] ?? e.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {e.details ?? ""}
                      {e.entityType && (
                        <span className="text-xs ml-1 opacity-70">
                          ({e.entityType}
                          {e.entityId != null ? ` #${e.entityId}` : ""})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
