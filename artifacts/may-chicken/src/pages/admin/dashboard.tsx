import { useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetAdminDashboard,
  getGetAdminDashboardQueryKey,
  useGetAdminSession,
  getGetAdminSessionQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import {
  TrendingUp,
  ShoppingBag,
  Euro,
  BarChart3,
  Users,
  ChefHat,
  CreditCard,
  Star,
  AlertTriangle,
  Package,
  Zap,
  UserCheck,
  UserX,
  Clock,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

const SOURCE_LABELS: Record<string, string> = {
  online: "Online",
  phone: "Telefon",
  lieferando: "Lieferando",
  takeaway: "Vor Ort",
  dine_in: "Tisch",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Bar",
  ec: "EC-Karte",
  paypal: "PayPal",
  stripe: "Stripe",
  lieferando: "Lieferando bezahlt",
};

const SOURCE_ORDER = ["online", "phone", "lieferando", "takeaway", "dine_in"];
const PAYMENT_ORDER = ["cash", "ec", "paypal", "stripe", "lieferando"];

// ── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  warn?: boolean;
}) {
  const borderColor = warn
    ? "border-yellow-500"
    : accent
      ? "border-primary"
      : "border-border";
  const iconBg = warn
    ? "bg-yellow-500/20"
    : accent
      ? "bg-primary/20"
      : "bg-secondary";
  const iconColor = warn
    ? "text-yellow-400"
    : accent
      ? "text-primary"
      : "text-muted-foreground";

  return (
    <div className={`bg-card border ${borderColor} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-white mb-1 leading-tight">
        {value}
      </p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground mt-1 opacity-70">{sub}</p>
      )}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="font-display font-bold uppercase text-white text-sm tracking-wider">
        {title}
      </h2>
    </div>
  );
}

function BarRow({
  label,
  value,
  sub,
  max,
  color = "bg-primary",
}: {
  label: string;
  value: number;
  sub?: string;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-white">{label}</span>
        <span className="text-sm font-bold text-white">{sub ?? value}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RankRow({
  rank,
  name,
  value,
  sub,
}: {
  rank: number;
  name: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className="text-primary font-bold text-sm w-5 shrink-0">
        {rank}.
      </span>
      <span className="text-white text-sm flex-1 truncate">{name}</span>
      <span className="text-muted-foreground text-sm shrink-0">
        {sub ?? `${value}×`}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-muted-foreground text-sm text-center py-6">{text}</p>
  );
}

function SkeletonGrid({ cols = 4, count = 4 }: { cols?: number; count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-4`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-card border border-border p-5 h-28 animate-pulse" />
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [, navigate] = useLocation();

  const { data: session, isLoading: sessionLoading } = useGetAdminSession({
    query: { queryKey: getGetAdminSessionQueryKey() },
  });
  const { data: stats, isLoading } = useGetAdminDashboard({
    query: {
      queryKey: getGetAdminDashboardQueryKey(),
      refetchInterval: 60_000,
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.authenticated) navigate("/backstage");
  }, [sessionLoading, session, navigate]);

  if (!sessionLoading && !session?.authenticated) return null;

  // ── Derived ─────────────────────────────────────────────────────────────

  const maxSourceRevenue = useMemo(
    () => Math.max(1, ...(stats?.bySource.map((s) => s.revenue) ?? [0])),
    [stats],
  );
  const maxPayRevenue = useMemo(
    () => Math.max(1, ...(stats?.byPayment.map((p) => p.revenue) ?? [0])),
    [stats],
  );
  const maxBestsellerQty = useMemo(
    () => Math.max(1, ...(stats?.bestsellers.map((b) => b.qty) ?? [0])),
    [stats],
  );
  const maxExtraQty = useMemo(
    () => Math.max(1, ...(stats?.topExtras.map((e) => e.qty) ?? [0])),
    [stats],
  );

  const sortedBySource = useMemo(
    () =>
      [...(stats?.bySource ?? [])].sort(
        (a, b) =>
          SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source),
      ),
    [stats],
  );
  const sortedByPayment = useMemo(
    () =>
      [...(stats?.byPayment ?? [])].sort(
        (a, b) =>
          PAYMENT_ORDER.indexOf(a.method) - PAYMENT_ORDER.indexOf(b.method),
      ),
    [stats],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase text-white">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Echtzeit-Übersicht · aktualisiert sich jede Minute
          </p>
        </div>
        {stats && (
          <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5">
            {stats.stockWarnings.length > 0 ? (
              <span className="text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stats.stockWarnings.length} Lagerwarnung
                {stats.stockWarnings.length !== 1 ? "en" : ""}
              </span>
            ) : (
              <span className="text-green-400">Lager: alles OK</span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <SkeletonGrid cols={4} count={4} />
          <SkeletonGrid cols={3} count={3} />
        </div>
      ) : !stats ? (
        <EmptyState text="Dashboard-Daten konnten nicht geladen werden." />
      ) : (
        <div className="space-y-6">
          {/* ── ROW 1: Key Revenue KPIs ─────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Umsatz heute"
              value={fmt(stats.revenue.today)}
              icon={Euro}
              accent
            />
            <KpiCard
              label="Bestellungen heute"
              value={String(stats.orders.today)}
              sub={`Ø ${fmt(stats.revenue.avgOrderValue)} pro Bestellung`}
              icon={ShoppingBag}
            />
            <KpiCard
              label="Umsatz diese Woche"
              value={fmt(stats.revenue.week)}
              icon={TrendingUp}
            />
            <KpiCard
              label="Umsatz diesen Monat"
              value={fmt(stats.revenue.month)}
              icon={BarChart3}
            />
          </div>

          {/* ── ROW 2: Order Status + Kitchen + Customers summary ─────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Offene Bestellungen"
              value={String(stats.kitchen.open)}
              sub="In Bearbeitung"
              icon={Clock}
              warn={stats.kitchen.open > 10}
            />
            <KpiCard
              label="Abgeschlossen"
              value={String(stats.kitchen.completed)}
              icon={ChefHat}
            />
            <KpiCard
              label="Storniert"
              value={String(stats.orders.cancelled)}
              icon={UserX}
            />
            <KpiCard
              label="Gesamt Bestellungen"
              value={String(stats.orders.total)}
              icon={Zap}
            />
          </div>

          {/* ── ROW 3: Bestellart + Zahlung ─────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bestellart */}
            <div className="bg-card border border-border p-5">
              <SectionTitle icon={ShoppingBag} title="Umsatz nach Bestellart" />
              {sortedBySource.length === 0 ? (
                <EmptyState text="Noch keine Bestellungen vorhanden." />
              ) : (
                sortedBySource.map((s) => (
                  <BarRow
                    key={s.source}
                    label={SOURCE_LABELS[s.source] ?? s.source}
                    value={s.revenue}
                    sub={`${fmt(s.revenue)} · ${s.count}×`}
                    max={maxSourceRevenue}
                  />
                ))
              )}
            </div>

            {/* Zahlungsübersicht */}
            <div className="bg-card border border-border p-5">
              <SectionTitle icon={CreditCard} title="Zahlungsübersicht" />
              {sortedByPayment.length === 0 ? (
                <EmptyState text="Noch keine Zahlungen vorhanden." />
              ) : (
                sortedByPayment.map((p) => (
                  <BarRow
                    key={p.method}
                    label={PAYMENT_LABELS[p.method] ?? p.method}
                    value={p.revenue}
                    sub={`${fmt(p.revenue)} · ${p.count}×`}
                    max={maxPayRevenue}
                    color="bg-blue-500"
                  />
                ))
              )}
            </div>
          </div>

          {/* ── ROW 4: Bestseller + Top Extras ──────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bestseller */}
            <div className="bg-card border border-border p-5">
              <SectionTitle icon={Star} title="Bestseller-Produkte" />
              {stats.bestsellers.length === 0 ? (
                <EmptyState text="Noch keine Bestellungen vorhanden." />
              ) : (
                <div className="space-y-1">
                  {stats.bestsellers.map((b, i) => (
                    <div key={b.name} className="mb-3">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-primary font-bold text-sm w-5 shrink-0">
                          {i + 1}.
                        </span>
                        <span className="text-white text-sm flex-1 truncate">
                          {b.name}
                        </span>
                        <span className="text-muted-foreground text-xs shrink-0">
                          {b.qty}× · {fmt(b.revenue)}
                        </span>
                      </div>
                      <div className="ml-8 h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.round((b.qty / maxBestsellerQty) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Extras */}
            <div className="bg-card border border-border p-5">
              <SectionTitle icon={Star} title="Beliebteste Extras & Optionen" />
              {stats.topExtras.length === 0 ? (
                <EmptyState text="Noch keine Extras bestellt." />
              ) : (
                stats.topExtras.map((e, i) => (
                  <div key={e.name} className="mb-3">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="text-primary font-bold text-sm w-5 shrink-0">
                        {i + 1}.
                      </span>
                      <span className="text-white text-sm flex-1 truncate">
                        {e.name}
                      </span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {e.qty}×
                      </span>
                    </div>
                    <div className="ml-8 h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{
                          width: `${Math.round((e.qty / maxExtraQty) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── ROW 5: Kundenstatistik + Küchenstatistik ─────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kundenstatistik */}
            <div className="bg-card border border-border p-5">
              <SectionTitle icon={Users} title="Kundenstatistik" />
              <div className="space-y-0">
                <RankRow
                  rank={1}
                  name="Kunden gesamt (registriert)"
                  value={stats.customers.total}
                  sub={String(stats.customers.total)}
                />
                <RankRow
                  rank={2}
                  name="Neue Kunden heute"
                  value={stats.customers.newToday}
                  sub={String(stats.customers.newToday)}
                />
                <RankRow
                  rank={3}
                  name="Neue Kunden diese Woche"
                  value={stats.customers.newThisWeek}
                  sub={String(stats.customers.newThisWeek)}
                />
                <RankRow
                  rank={4}
                  name="Stammkunden"
                  value={stats.customers.regular}
                  sub={String(stats.customers.regular)}
                />
                <div className="flex items-center gap-3 py-2 border-t border-border mt-1">
                  <UserX className="h-4 w-4 text-yellow-400 shrink-0" />
                  <span className="text-sm text-yellow-300 flex-1">
                    Inaktiv seit 30+ Tagen
                  </span>
                  <span className="text-sm font-bold text-yellow-400">
                    {stats.customers.inactive30d}
                  </span>
                </div>
              </div>
            </div>

            {/* Küchenstatistik */}
            <div className="bg-card border border-border p-5">
              <SectionTitle icon={ChefHat} title="Küchenstatistik" />
              <div className="space-y-0">
                <RankRow
                  rank={1}
                  name="Offene Bestellungen"
                  value={stats.kitchen.open}
                  sub={
                    stats.kitchen.open > 0 ? (
                      <span className="text-yellow-400 font-bold">
                        {stats.kitchen.open}
                      </span>
                    ) as unknown as string : "0"
                  }
                />
                <RankRow
                  rank={2}
                  name="Abgeschlossene Bestellungen"
                  value={stats.kitchen.completed}
                  sub={String(stats.kitchen.completed)}
                />
                <RankRow
                  rank={3}
                  name="Stornierte Bestellungen"
                  value={stats.orders.cancelled}
                  sub={String(stats.orders.cancelled)}
                />
                <div className="flex items-center gap-3 py-2 border-t border-border mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">
                    Ø Bearbeitungszeit
                  </span>
                  <span className="text-sm text-muted-foreground italic">
                    {stats.kitchen.avgPrepMinutes !== null
                      ? `${stats.kitchen.avgPrepMinutes} Min.`
                      : "nicht erfasst"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 6: Lagerwarnungen ────────────────────────────────────── */}
          <div className="bg-card border border-border p-5">
            <SectionTitle icon={Package} title="Lagerwarnungen" />
            {stats.stockWarnings.length === 0 ? (
              <div className="flex items-center gap-2 text-green-400 text-sm py-2">
                <UserCheck className="h-4 w-4" />
                <span>Alle Lagerbestände im grünen Bereich.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.stockWarnings.map((w) => (
                  <div
                    key={w.id}
                    className="border border-yellow-500/40 bg-yellow-500/5 p-3 flex items-center gap-3"
                  >
                    <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">
                        {w.name}
                      </p>
                      <p className="text-xs text-yellow-300">
                        Bestand: {w.currentStock} {w.unit} · Min: {w.minStock}{" "}
                        {w.unit}
                      </p>
                      {w.servings != null && (
                        <p className="text-xs text-yellow-400/90 font-medium mt-0.5">
                          Reicht noch für ca. {w.servings}
                          {w.servingsProduct ? ` × ${w.servingsProduct}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
