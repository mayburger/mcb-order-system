import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetAdminOpeningHours, getGetAdminOpeningHoursQueryKey,
  useUpdateOpeningHours,
  useGetAdminSession, getGetAdminSessionQueryKey
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RowEdit { openTime: string; closeTime: string; isClosed: boolean; }

export default function AdminOpeningHours() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: session, isLoading: sl } = useGetAdminSession({ query: { queryKey: getGetAdminSessionQueryKey() } });
  const { data: hours, isLoading } = useGetAdminOpeningHours({ query: { queryKey: getGetAdminOpeningHoursQueryKey() } });
  const updateHours = useUpdateOpeningHours();
  const [edits, setEdits] = useState<Record<number, RowEdit>>({});

  if (!sl && !session?.authenticated) { navigate("/admin"); return null; }

  const getRow = (dayOfWeek: number, def: RowEdit): RowEdit =>
    edits[dayOfWeek] ?? { openTime: def.openTime ?? "09:00", closeTime: def.closeTime ?? "22:00", isClosed: def.isClosed };

  const handleSave = (dayOfWeek: number) => {
    if (!hours) return;
    const row = edits[dayOfWeek];
    if (!row) return;
    const allHours = hours.map((day) => {
      const r = day.dayOfWeek === dayOfWeek ? row : getRow(day.dayOfWeek, { openTime: day.openTime ?? "09:00", closeTime: day.closeTime ?? "22:00", isClosed: day.isClosed });
      return { dayOfWeek: day.dayOfWeek, isClosed: r.isClosed, openTime: r.openTime, closeTime: r.closeTime };
    });
    updateHours.mutate(
      { data: { hours: allHours } },
      {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getGetAdminOpeningHoursQueryKey() }); toast({ title: "Gespeichert" }); },
        onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold uppercase text-white">Öffnungszeiten</h1>
        <p className="text-muted-foreground mt-1">Lege die Öffnungszeiten für jeden Wochentag fest.</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(7)].map((_, i) => <div key={i} className="h-16 bg-card border border-border animate-pulse" />)}</div>
      ) : (
        <div className="bg-card border border-border divide-y divide-border">
          {hours?.map((day) => {
            const row = getRow(day.dayOfWeek, { openTime: day.openTime ?? "09:00", closeTime: day.closeTime ?? "22:00", isClosed: day.isClosed });
            return (
              <div key={day.dayOfWeek} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                <div className="w-28 shrink-0">
                  <p className="font-bold text-white">{day.dayName}</p>
                </div>

                <div className="flex items-center gap-3 flex-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button type="button"
                      className={`w-10 h-5 rounded-full transition-colors relative ${row.isClosed ? "bg-destructive/60" : "bg-primary"}`}
                      onClick={() => setEdits({ ...edits, [day.dayOfWeek]: { ...row, isClosed: !row.isClosed } })}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${row.isClosed ? "left-0.5" : "right-0.5"}`} />
                    </button>
                    <span className={`text-sm ${row.isClosed ? "text-destructive" : "text-muted-foreground"}`}>{row.isClosed ? "Geschlossen" : "Geöffnet"}</span>
                  </label>

                  {!row.isClosed && (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={row.openTime} className="rounded-none border-border bg-background text-white w-32"
                        onChange={(e) => setEdits({ ...edits, [day.dayOfWeek]: { ...row, openTime: e.target.value } })} />
                      <span className="text-muted-foreground">–</span>
                      <Input type="time" value={row.closeTime} className="rounded-none border-border bg-background text-white w-32"
                        onChange={(e) => setEdits({ ...edits, [day.dayOfWeek]: { ...row, closeTime: e.target.value } })} />
                    </div>
                  )}
                </div>

                <Button size="sm" className="rounded-none uppercase tracking-wider text-xs font-bold bg-primary hover:bg-primary/90 shrink-0"
                  disabled={!edits[day.dayOfWeek] || updateHours.isPending}
                  onClick={() => handleSave(day.dayOfWeek)}>
                  Speichern
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
