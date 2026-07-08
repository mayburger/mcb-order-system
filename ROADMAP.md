# Interne Entwicklungs-Roadmap — May Chicken & Burger Bestellsystem

Stand: 08.07.2026 · Nur Analyse & Planung, keine Umsetzung.

---

## 1. Ist-Stand (Bestandsaufnahme)

| Bereich | Status | Anmerkung |
|---|---|---|
| Kundenbereich (Menü, Warenkorb, Checkout, Bestellstatus, Konto) | ✅ funktioniert | |
| Adminbereich (Dashboard, Bestellungen, Produkte, Kategorien, Kunden/CRM, Gutscheine, Liefergebiete, Öffnungszeiten, Benutzer/Rollen, Einstellungen) | ✅ größtenteils | 20 Admin-Seiten vorhanden |
| Küche (Küchenmonitor, Statuswechsel) | ✅ funktioniert | |
| Fahrer-Ansicht | ✅ funktioniert | |
| Bestellhistorie / Archiv / Löschprotokoll | ✅ funktioniert | |
| Lager (`stock_items`, `stock_movements`, `recipes`) | 🟡 vorbereitet | Struktur da, keine echten Daten |
| Aktivitätsprotokoll (`activity_log`) | 🟡 teilweise | Nicht alle Module protokollieren |
| Zahlungsarten-Konfiguration | ✅ vorhanden | Nur Konfiguration, keine echte Online-Zahlung |
| GitHub-Backup | ✅ vorhanden | |
| RBAC (Rollen Inhaber/Admin/Kasse/Küche/Fahrer, Berechtigungen) | ✅ vorhanden | zentral in `@workspace/authz` |

**Technische Basis:** pnpm-Monorepo · Express 5 API · React + Vite · PostgreSQL (Drizzle) · OpenAPI mit generiertem API-Client.

**Wichtiger Hinweis zu Modul 1:** Das Kassenmodul ist in dieser Sitzung bereits **serverseitig fertig** (Datenbank, Rechte, API, generierter Client). Es fehlen nur noch die drei Admin-Seiten. Details unten.

---

## 2. Modul 1 — Kassen- & Zahlungsmodul (höchste Priorität)

**Ziel:** Tageskasse, Kassenabschluss (Tag/Schicht) mit Differenzberechnung und PDF-Druck, Berichte. Nur Administratoren dürfen Abschlüsse durchführen/löschen.

**Status: ~70 % fertig (Backend komplett, Frontend offen)**

### Bereits umgesetzt
- **DB:** `restaurant_branches` (Filialen, vorbereitet für Mehrfilialen), `restaurant_cash_movements` (Einlage/Entnahme/Trinkgeld/Rückerstattung/Korrektur), `restaurant_cash_closings` (Abschlüsse mit Soll/Ist/Differenz), `orders.branch_id` (nullable). Standard-Filiale „Hauptfiliale“ angelegt.
- **Rechte:** `cashRegister.view` (Inhaber/Admin/Kasse), `cashClosing.manage` (nur Inhaber/Admin).
- **API:** `GET /admin/cash/today` (Tageskasse), `POST/DELETE /admin/cash/movements`, `GET/POST /admin/cash/closings`, `GET/DELETE /admin/cash/closings/:id`, `GET /admin/reports` (heute/Woche/Monat, nach Kategorie/Filiale/Zahlungsart/Tag).
- **API-Client:** Hooks generiert (`useGetCashToday`, `useCreateCashClosing`, `useGetReports`, …).

### Noch offen (Restaufwand: klein)
| Seite | Route | Inhalt |
|---|---|---|
| Tageskasse | `/backstage/cash-register` | Kassenbestand, Einnahmen nach Zahlungsart, Trinkgeld, Stornos, Rückerstattungen, Bewegungen erfassen |
| Kassenabschluss | `/backstage/cash-closing` | Tages-/Schichtabschluss durchführen, Differenz Soll/Ist, Historie, PDF-Druck (über Druckfenster wie bei Bons) |
| Berichte | `/backstage/reports` | Umsatz heute/Woche/Monat, nach Kategorie, Zahlungsart, Filiale |

Dazu: 3 Routen in der App, 3 Navigationseinträge, Abschluss-Druckvorlage.

**Abhängigkeiten:** keine. **Aufwand gesamt:** Rest ≈ 0,5–1 Tag.

---

## 3. Modul 2 — Tischverwaltung & Reservierungen

**Ziel:** Tische anlegen/verwalten, Reservierungen annehmen (telefonisch + online), Tischstatus für den Service, Verknüpfung Tisch ↔ Bestellung.

### Datenbankänderungen (additiv)
- `restaurant_tables`: id, branch_id, Name/Nummer, Sitzplätze, Bereich (innen/außen), Status (frei/besetzt/reserviert/gesperrt), sort_order, aktiv
- `restaurant_reservations`: id, table_id (nullable = noch nicht zugewiesen), Kunde (Name, Telefon, E-Mail, optional customer_id), Datum/Uhrzeit, Dauer, Personenzahl, Status (angefragt/bestätigt/eingetroffen/abgeschlossen/storniert/no-show), Notiz, created_by
- `orders.table_id` (nullable) — ersetzt langfristig das Freitextfeld `table_info`

### APIs
- `GET/POST/PATCH/DELETE /admin/tables` (Tischverwaltung)
- `GET/POST/PATCH /admin/reservations` (+ Statuswechsel, Tageskalender-Filter)
- `POST /reservations` (öffentliche Online-Reservierungsanfrage, mit Kapazitätsprüfung)
- Kapazitätslogik: freie Tische je Zeitfenster ermitteln

### Seiten
- Admin: `/backstage/tables` (Tischplan/Liste mit Status), `/backstage/reservations` (Tageskalender + Liste)
- Kundenbereich: `/reservierung` (Online-Anfrageformular)

### Rechte
- `tables.manage` (Inhaber/Admin), `reservations.manage` (Inhaber/Admin/Kasse)

**Abhängigkeiten:** keine harten; nutzt `branches` aus Modul 1. **Aufwand:** ≈ 2–3 Tage.

---

## 4. Modul 3 — Lager mit echten Testdaten

**Ziel:** Vorbereitetes Lager produktiv machen: realistische Artikel, Rezepturen (Zutatenverbrauch je Gericht), automatische Bestandsabbuchung bei Bestellungen, Warnungen bei Mindestbestand.

### Datenbankänderungen
- Keine neuen Tabellen nötig (`stock_items`, `stock_movements`, `recipes` existieren)
- Ergänzungen: `stock_items.min_stock`-Prüfung schärfen, ggf. `supplier`/`unit_cost`-Felder, Seed-Skript mit ~30–50 realistischen Artikeln (Fleisch, Brötchen, Saucen, Getränke, Verpackung) + Rezepturen für die Top-Produkte

### APIs
- Vorhandene Lager-Endpunkte prüfen/erweitern: Abbuchungs-Hook bei Bestellabschluss (Rezeptur → Verbrauch), `GET /admin/stock/alerts` (Unterbestand), Inventur-Endpunkt (Zählung + Korrekturbuchung)

### Seiten
- `/backstage/inventory` erweitern: Unterbestand-Warnungen, Inventur-Modus, Verbrauchshistorie je Artikel

### Rechte
- vorhandenes `products.manage` weiternutzen oder feiner: `inventory.manage`

**Abhängigkeiten:** keine. **Aufwand:** ≈ 1,5–2 Tage.
Hinweis: Hierzu existieren bereits vorgeschlagene Folgeaufgaben (Lager/Zutaten/Rezepturen).

---

## 5. Modul 4 — Vollständiges Audit-Log

**Ziel:** Lückenlose Protokollierung aller sicherheits- und geschäftsrelevanten Aktionen in allen Modulen, mit Vorher/Nachher-Werten.

### Datenbankänderungen
- `restaurant_activity_log` erweitern: `entity_type`, `entity_id`, `old_values` (jsonb), `new_values` (jsonb), `ip_address` — additiv, bestehende Einträge bleiben gültig

### APIs / Backend
- Zentrale Log-Middleware/Helper statt Einzelaufrufe; Abdeckung ergänzen für: Produkte/Kategorien/Optionen, Einstellungen, Öffnungszeiten, Liefergebiete, Gutscheine, Lager, Tische/Reservierungen, Kassenbewegungen, Login-Fehlversuche
- `GET /admin/activity-log` erweitern: Filter nach Entität, Benutzer, Zeitraum, Aktionstyp; Export (CSV)

### Seiten
- `/backstage/activity-log` erweitern: Filterleiste, Detailansicht mit Vorher/Nachher-Vergleich

### Rechte
- vorhandenes `activityLog.view` (nur Inhaber/Admin)

**Abhängigkeiten:** sinnvoll NACH Modul 2 (damit neue Entitäten direkt abgedeckt sind). **Aufwand:** ≈ 1–1,5 Tage.

---

## 6. Modul 5 — Online-Zahlungen

**Ziel:** Echte Zahlungsabwicklung im Checkout (Karte, PayPal), automatischer Statuswechsel auf „Bezahlt“, Rückerstattungen aus dem Admin.

### Datenbankänderungen
- `restaurant_payments` (neu): id, order_id, Anbieter (stripe/paypal), Anbieter-Transaktions-ID, Betrag, Währung, Status (pending/succeeded/failed/refunded/partial_refund), Fehlergrund, Zeitstempel
- `orders.payment_status` bleibt führend, wird durch Webhooks aktualisiert

### APIs
- `POST /orders/:id/pay` (Zahlung initiieren, Checkout-Session)
- `POST /webhooks/stripe` bzw. `/webhooks/paypal` (Statusupdates, signaturgeprüft)
- `POST /admin/orders/:id/refund` (Rückerstattung, nur Admin; verbucht automatisch eine Kassen-/Zahlungsbewegung → Anbindung an Modul 1)

### Seiten
- Checkout: Zahlungsschritt mit Weiterleitung/eingebettetem Zahlungsformular
- `/backstage/payments` erweitern: Transaktionsliste, Rückerstattungs-Button
- Bestelldetail: Zahlungsverlauf

### Rechte / Sicherheit
- `payments.refund` (nur Inhaber/Admin) · Webhook-Signaturprüfung · keine Kartendaten im eigenen System (nur Anbieter-Referenzen)
- Benötigt Anbieter-Zugangsdaten (API-Keys) — werden erst bei Umsetzung eingerichtet

**Abhängigkeiten:** Modul 1 (Rückerstattungen fließen in Tageskasse/Abschluss ein). **Aufwand:** ≈ 3–4 Tage (größtes Modul, externer Anbieter + Webhooks + Tests).

---

## 7. Modul 6 — Erweiterte Statistiken

**Ziel:** Tiefere Auswertungen über die Basis-Berichte (Modul 1) hinaus.

### Inhalte
- Zeitvergleiche (Woche/Monat/Jahr zum Vorzeitraum), Umsatz nach Stunde/Wochentag (Stoßzeiten)
- Produkt-Ranking (Renner/Penner), Deckungsbeitrag (benötigt Wareneinsatz aus Modul 3)
- Kundenstatistik (Neu-/Stammkunden, Ø Bestellwert, Wiederkaufrate) auf CRM-Basis
- Liefergebiets-Auswertung, Storno-/Rabattquoten
- Export (CSV), optional Filialvergleich (nutzt `branches`)

### Technik
- Keine neuen Tabellen — nur Auswertungs-Endpunkte (`GET /admin/stats/...`) auf Bestandsdaten; ggf. Indizes auf `orders.created_at`, `orders.branch_id` für Performance
- Neue Seite `/backstage/statistics` mit Diagrammen (vorhandene Chart-Bibliothek des Dashboards weiternutzen)

**Abhängigkeiten:** Modul 1 (Berichts-Grundlage), voller Nutzen mit Modul 3 (Wareneinsatz) und Modul 5 (Zahlungsdaten). **Aufwand:** ≈ 2 Tage.

---

## 8. Empfohlene Reihenfolge & Phasen

| Phase | Module | Begründung |
|---|---|---|
| **Phase 1** (sofort) | Modul 1 abschließen (nur noch 3 Frontend-Seiten) | Backend fertig, schneller Abschluss |
| **Phase 2** | Modul 2 (Tische/Reservierungen) → Modul 3 (Lager-Testdaten) | unabhängig, klarer Geschäftsnutzen; Lager kann parallel laufen |
| **Phase 3** | Modul 4 (Audit-Log) | deckt dann auch die neuen Module 1–3 ab |
| **Phase 4** | Modul 5 (Online-Zahlungen) | größtes Risiko/Aufwand, baut auf stabiler Kasse auf |
| **Phase 5** | Modul 6 (Statistiken) | profitiert von allen Vorgänger-Daten |

**Gesamtaufwand (grobe Schätzung):** ≈ 10–13 Entwicklungstage.

### Querschnittsthemen (bei jedem Modul beachten)
- Alle DB-Änderungen **additiv** (keine bestehenden Tabellen/Spalten ändern oder löschen)
- Rechte immer zentral in `@workspace/authz` ergänzen
- API immer über OpenAPI-Spezifikation + Client-Generierung (kein manueller Fetch-Code)
- Bestehende Module nicht verändern — neue Funktionen als eigene Routen/Seiten
- Nach jedem Modul: GitHub-Backup
