import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { useGetAdminSettings } from "@workspace/api-client-react";
import {
  printKitchenTicket,
  printCustomerTicket,
  printDriverTicket,
  buildKitchenHtml,
  buildCustomerHtml,
  buildDriverHtml,
  MOCK_ORDER,
  type PrintSettings,
} from "@/lib/print-utils";
import {
  Printer,
  ChefHat,
  Receipt,
  Car,
  Info,
  Thermometer,
} from "lucide-react";

// ── Preview iframe ────────────────────────────────────────────────────────────

function ReceiptPreview({ html }: { html: string }) {
  const doc = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.45;
    width: 80mm;
    margin: 0;
    padding: 3mm 4mm;
    color: #000;
    background: #fff;
  }
  h1 { font-size: 15px; font-weight: bold; text-align: center; margin: 0 0 2px; letter-spacing: 0.5px; }
  h2 { font-size: 13px; font-weight: bold; text-align: center; margin: 0 0 6px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .big { font-size: 14px; font-weight: bold; }
  .xl { font-size: 18px; font-weight: bold; }
  hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  hr.solid { border-top: 1px solid #000; }
  hr.double { border-top: 3px double #000; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; }
  .row .label { flex: 1; }
  .row .val { text-align: right; white-space: nowrap; }
  .item-name { font-size: 12px; font-weight: bold; }
  .item-detail { padding-left: 10px; color: #333; }
  .item-extra { padding-left: 14px; color: #555; }
  .note-box { border: 1px solid #000; padding: 3px 5px; margin: 4px 0; }
  .note-label { font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .spacer { height: 4px; }
  .invert { background: #000; color: #fff; padding: 2px 5px; text-align: center; }
</style>
</head><body>${html}</body></html>`;

  return (
    <iframe
      srcDoc={doc}
      className="w-full bg-white rounded border border-gray-200"
      style={{ height: "480px", minWidth: "220px", maxWidth: "320px" }}
      title="Bon-Vorschau"
    />
  );
}

// ── Bon card ──────────────────────────────────────────────────────────────────

interface BonCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badgeColor: string;
  previewHtml: string;
  onPrint: () => void;
}

function BonCard({ icon, title, description, badgeColor, previewHtml, onPrint }: BonCardProps) {
  return (
    <div className="flex flex-col bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg ${badgeColor} flex items-center justify-center text-white shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
        </div>
      </div>

      {/* Receipt preview */}
      <div className="flex justify-center p-4 bg-gray-50/5">
        <ReceiptPreview html={previewHtml} />
      </div>

      {/* Print button */}
      <div className="p-4 border-t border-border">
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider rounded-none h-11"
          onClick={onPrint}
        >
          <Printer className="w-4 h-4 mr-2" />
          Test-Druck: {title}
        </Button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPrintSettings() {
  const { data: settings } = useGetAdminSettings();

  const ps: PrintSettings = {
    restaurantName: settings?.restaurantName ?? "May Chicken & Burger",
    address: settings?.address ?? "",
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
  };

  const order = { ...MOCK_ORDER, createdAt: new Date().toISOString() };

  return (
    <AdminLayout>
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white flex items-center gap-3">
            <Printer className="w-7 h-7 text-primary" />
            Drucker &amp; Bons
          </h1>
          <p className="text-muted-foreground mt-1">
            Bon-Vorlagen für Küche, Kunde und Fahrer — optimiert für 80mm Thermodrucker.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex gap-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold">Browser-Druck aktiv</p>
            <p className="mt-1 text-blue-300">
              Der Bon öffnet sich als neues Fenster und startet den Browser-Druckdialog automatisch.
              Wähle dort deinen Thermo-Bondrucker (z.B. Epson TM-T20, Star TSP100) und stelle
              das Papierformat auf <strong>80mm</strong> ein. Direkte ESC/POS-Unterstützung
              ohne Browser-Dialog kommt in einer künftigen Version.
            </p>
          </div>
        </div>

        {/* 80mm setup tip */}
        <div className="flex gap-3 bg-secondary/60 border border-border rounded-lg p-4">
          <Thermometer className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-white">Thermodrucker richtig einrichten</p>
            <ol className="mt-2 space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Drucker im Betriebssystem als Standarddrucker festlegen</li>
              <li>Im Druckerdialog: Papierformat → <strong className="text-white">80mm × (Rolle)</strong></li>
              <li>Ränder → <strong className="text-white">Keine</strong> (oder minimal)</li>
              <li>Skalierung → <strong className="text-white">100 %</strong> (nicht „An Seite anpassen")</li>
              <li>Kopf- &amp; Fußzeile im Browser-Druckdialog deaktivieren</li>
            </ol>
          </div>
        </div>

        {/* Bon cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BonCard
            icon={<ChefHat className="w-5 h-5" />}
            title="Küchenbon"
            badgeColor="bg-orange-600"
            description="Für die Küche: Bestellnummer, Uhrzeit, Bestellart, alle Produkte mit Größen & Extras, Notizen, Allergiehinweise."
            previewHtml={buildKitchenHtml(order as any)}
            onPrint={() => printKitchenTicket(order as any, ps)}
          />

          <BonCard
            icon={<Receipt className="w-5 h-5" />}
            title="Kundenbon"
            badgeColor="bg-primary"
            description="Für den Kunden: Restaurantname, Adresse, Bestellnummer, alle Artikel mit Preisen, Lieferkosten, Gesamt, Zahlungsart."
            previewHtml={buildCustomerHtml(order as any, ps)}
            onPrint={() => printCustomerTicket(order as any, ps)}
          />

          <BonCard
            icon={<Car className="w-5 h-5" />}
            title="Fahrerbon"
            badgeColor="bg-purple-600"
            description="Für den Fahrer: Name, Telefon, Lieferadresse, Notiz, Zahlungsstatus und Betrag bei Barzahlung."
            previewHtml={buildDriverHtml(order as any, ps)}
            onPrint={() => printDriverTicket(order as any, ps)}
          />
        </div>

        {/* Content legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              color: "bg-orange-600",
              title: "Küchenbon enthält",
              items: [
                "Bestellnummer (groß)",
                "Datum & Uhrzeit",
                "Bestellart (Lieferung / Abholung / Tisch)",
                "Kanal (Online / Telefon / Lieferando …)",
                "Produkte: Menge · Name · Größe · Extras",
                "Notiz / Allergiehinweis (hervorgehoben)",
              ],
            },
            {
              color: "bg-primary",
              title: "Kundenbon enthält",
              items: [
                "Restaurantname, Adresse, Telefon",
                "Bestellnummer & Datum",
                "Lieferart",
                "Alle Artikel mit Einzelpreisen",
                "Lieferkosten & Rabatt",
                "Gesamtbetrag",
                "Zahlungsart & Bezahlstatus",
              ],
            },
            {
              color: "bg-purple-600",
              title: "Fahrerbon enthält",
              items: [
                "Bestellnummer",
                "Kundenname & Telefonnummer",
                "Vollständige Lieferadresse",
                "Lieferhinweis / Notiz",
                "Zahlungsart & Bezahlstatus",
                "Betrag bei Barzahlung (groß + Hinweis)",
              ],
            },
          ].map((col) => (
            <div key={col.title} className="bg-secondary/30 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${col.color}`} />
                <h4 className="font-bold text-white text-sm">{col.title}</h4>
              </div>
              <ul className="space-y-1.5">
                {col.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
