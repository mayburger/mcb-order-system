import { useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { useGetReports } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Euro, ShoppingBag, TrendingUp, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Heute",
  week: "Letzte 7 Tage",
  month: "Dieser Monat",
};

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-md p-4 ${accent ? "border-primary" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`p-1.5 rounded ${accent ? "bg-primary/20" : "bg-secondary"}`}>
          <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminReports() {
  const [period, setPeriod] = useState<Period>("week");
  const { data, isLoading } = useGetReports({ period });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
              Berichte<span className="text-primary">.</span>
            </h1>
            <p className="text-sm text-muted-foreground">Umsatz-Auswertungen nach Zeitraum, Kategorie und Zahlungsart</p>
          </div>
          <div className="flex gap-2">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground py-12 text-center">Lade Berichte…</p>}

        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label={`Umsatz (${PERIOD_LABELS[period]})`} value={fmt(data.summary.total)} sub={`${data.summary.orderCount} Bestellungen`} icon={Euro} accent />
              <KpiCard label="Ø Bestellwert" value={fmt(data.summary.avgOrderValue)} icon={TrendingUp} />
              <KpiCard label="Umsatz heute" value={fmt(data.headline.today)} icon={ShoppingBag} />
              <KpiCard label="Umsatz Monat" value={fmt(data.headline.month)} sub={`7 Tage: ${fmt(data.headline.week)}`} icon={BarChart3} />
            </div>

            <div className="bg-card border border-border rounded-md p-4">
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Umsatz pro Tag</h2>
              {data.byDay.every((d) => d.revenue === 0) ? (
                <p className="text-sm text-muted-foreground italic py-8 text-center">Keine Umsätze im Zeitraum</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byDay.map((d) => ({ ...d, label: new Date(`${d.date}T00:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                      <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v: number) => `${v} €`} />
                      <Tooltip
                        formatter={(value: number) => [fmt(value), "Umsatz"]}
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 0 }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Bar dataKey="revenue" fill="#f43f5e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-md">
                <div className="p-4 border-b border-border">
                  <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Umsatz nach Kategorie</h2>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategorie</TableHead>
                      <TableHead className="text-right">Menge</TableHead>
                      <TableHead className="text-right">Umsatz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byCategory.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Keine Daten</TableCell></TableRow>
                    )}
                    {data.byCategory.map((row) => (
                      <TableRow key={row.name} className="hover:bg-secondary/20">
                        <TableCell className="text-white">{row.name}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{row.qty}</TableCell>
                        <TableCell className="text-right font-mono text-white">{fmt(row.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-6">
                <div className="bg-card border border-border rounded-md">
                  <div className="p-4 border-b border-border">
                    <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Umsatz nach Zahlungsart</h2>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zahlungsart</TableHead>
                        <TableHead className="text-right">Anzahl</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byPaymentMethod.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Keine Daten</TableCell></TableRow>
                      )}
                      {data.byPaymentMethod.map((row) => (
                        <TableRow key={row.method} className="hover:bg-secondary/20">
                          <TableCell className="text-white">{row.label}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{row.count}</TableCell>
                          <TableCell className="text-right font-mono text-white">{fmt(row.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-card border border-border rounded-md">
                  <div className="p-4 border-b border-border">
                    <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Umsatz nach Filiale</h2>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filiale</TableHead>
                        <TableHead className="text-right">Bestellungen</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byBranch.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Keine Daten</TableCell></TableRow>
                      )}
                      {data.byBranch.map((row) => (
                        <TableRow key={`${row.branchId ?? "x"}-${row.name}`} className="hover:bg-secondary/20">
                          <TableCell className="text-white">{row.name}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">{row.orderCount}</TableCell>
                          <TableCell className="text-right font-mono text-white">{fmt(row.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
