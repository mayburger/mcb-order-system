# Technischer Umsetzungsplan: Mobile May Chicken App — Version 2 (kostensparende Phasen)

Stand: 08.07.2026 · Nur Planung, keine Umsetzung.
**Grundprinzip: Bestehendes System bleibt unverändert — die App ist ein zusätzlicher Client auf der vorhandenen API.**

---

## 1. Was sich gegenüber Plan V1 ändert

| | Plan V1 | Plan V2 (dieser Plan) |
|---|---|---|
| Umfang Start | Kunden-App + Mitarbeiter-Teil + Push | **Nur Kunden-App** |
| Push Notifications | ab Start | **später** (Architektur vorbereitet) |
| Mitarbeiter/Fahrer/Kasse | Phase B | **später** (Architektur vorbereitet) |
| Backend-Vorbereitung | Token + Push-Tabellen | **nur Kunden-Token-Login** (minimal) |
| Aufwand bis erste nutzbare App | ~9–12 Tage | **~5–6,5 Tage, in 5 kleinen Teilphasen** |

Jede Teilphase liefert ein prüfbares Ergebnis — es kann nach jeder Phase pausiert werden, ohne halbfertige Baustellen.

---

## 2. Phase 1 — Kunden-App (einziger aktueller Auftrag)

### Phase 1.0 — Backend: Kunden-Token-Login (≈ 0,5–1 Tag)

Das einzige, was der API fehlt: Login ohne Cookies (native Apps brauchen Bearer-Token; der generierte API-Client unterstützt das bereits über `setAuthTokenGetter`).

**Neue Tabelle (additiv):** `restaurant_api_tokens`
- id, **owner_type** (`customer` | `staff` — Staff-Wert schon jetzt vorgesehen, später ohne Schemaänderung nutzbar), owner_id, token_hash (nur Hash, nie Klartext), device_name, created_at, expires_at, last_used_at, revoked_at

**Neue Endpunkte (Session-Login bleibt unangetastet):**
- `POST /customer/auth/token` — E-Mail + Passwort → { token, customer } (nutzt vorhandene Passwortprüfung)
- `POST /customer/auth/token/revoke` — Logout des Geräts
- Registrierung: vorhandener `POST /customer/auth/register` wird wiederverwendet, danach Token-Ausstellung

**Middleware-Erweiterung (rückwärtskompatibel):** Kunden-Auth akzeptiert Session-Cookie **oder** `Authorization: Bearer` — eine kleine Ergänzung an einer Stelle; Web-Verhalten bleibt identisch.

**OpenAPI + Codegen:** neue Endpunkte in die Spezifikation, Client-Hooks generieren (gleicher Workflow wie bisher).

✅ Prüfbar: Token-Login per API-Test, Web-Login weiterhin unverändert.

---

### Phase 1.1 — Expo-Grundgerüst + API-Verbindung (≈ 0,5 Tag)

- Neues Artefakt `artifacts/may-chicken-mobile` (Expo + expo-router, TypeScript, eigener Workflow — Web-App und API bleiben unberührt)
- Anbindung: `setBaseUrl(<API-Adresse>)` aus `@workspace/api-client-react` — **dieselben generierten Hooks wie im Web, kein doppelter API-Code**
- Dunkles Theme passend zur Marke (Farben/Schriften aus der Web-App übernommen)
- Erster Screen: Speisekarten-Kategorien laden (Beweis, dass API-Verbindung steht)

**Vorbereitung für später (kostet jetzt nichts):**
- Ordnerstruktur mit Routen-Gruppe `(customer)/` — eine spätere Gruppe `(staff)/` kann daneben ergänzt werden, ohne Bestehendes umzubauen
- Zentrale `auth`-Schicht mit `ownerType`-Feld (heute immer `customer`)

✅ Prüfbar: App startet, Kategorien erscheinen.

---

### Phase 1.2 — Token-Login & Kundenkonto-Grundlage (≈ 1 Tag)

- Login- und Registrierungs-Screen (nutzen die neuen Token-Endpunkte)
- Token sicher gespeichert (`expo-secure-store`), automatischer Re-Login beim App-Start, `setAuthTokenGetter` verdrahtet
- Auth-Context wie im Web (`isAuthenticated`, `customer`, `logout`)
- Gast-Nutzung bleibt möglich (Bestellen ohne Konto, wie im Web)

✅ Prüfbar: Registrieren, anmelden, App neu starten → weiterhin angemeldet, abmelden.

---

### Phase 1.3 — Menü & Warenkorb (≈ 1,5 Tage)

- **Menü:** Kategorien-Tabs, Produktliste, Produktdetail mit Varianten/Optionsgruppen/Extras (gleiche Preislogik wie Web — die Berechnungslogik aus `cart-context` wird als Vorlage portiert)
- **Warenkorb:** lokal auf dem Gerät (AsyncStorage), Menge ändern, Optionen bearbeiten, Zwischensumme
- Öffnungszeiten-Hinweis (geschlossen → Hinweis wie im Web)

✅ Prüfbar: Produkt mit Optionen in den Warenkorb, Preise stimmen mit Web überein.

---

### Phase 1.4 — Checkout, Konto & Bestellhistorie (≈ 1,5 Tage)

- **Checkout:** Lieferung/Abholung, Adresse + Liefergebietsprüfung, Gutschein-Einlösung, Zahlungsarten (dieselben wie Web: Bar/EC etc. — Online-Zahlung ist bewusst NICHT Teil dieser Phase), Bestellung absenden über vorhandenen Endpunkt
- **Bestellstatus:** Statusseite mit Aktualisierung durch regelmäßiges Nachladen (Polling) — *bewusst ohne Push; wenn Push später kommt, ersetzt es nur das Polling*
- **Kundenkonto:** Profil anzeigen/bearbeiten, **Bestellhistorie** (vorhandene Endpunkte), Favoriten mit „Nochmal bestellen“
- Angemeldete Kunden: Checkout-Felder vorausgefüllt

✅ Prüfbar: kompletter Bestellablauf Ende-zu-Ende, Bestellung erscheint im Admin-Web + in der App-Historie.

---

**Phase-1-Gesamtaufwand: ≈ 5–6,5 Tage** (V1: 9–12 Tage für den größeren Umfang)

---

## 3. Bewusst NICHT in Phase 1 (aber architektonisch vorbereitet)

| Später-Modul | Vorbereitung in Phase 1 (kostenlos mitgedacht) | Was später dazukommt |
|---|---|---|
| **Push Notifications** | Bestellstatus als eigener Datenlade-Baustein (Polling) — austauschbar | Push-Token-Tabelle + Registrier-Endpunkte, Versand-Trigger im Server, `expo-notifications` |
| **Mitarbeiter-App** | `owner_type='staff'` in der Token-Tabelle schon vorgesehen; Routen-Gruppe `(staff)/` einplanbar; Rechte-Paket `@workspace/authz` ist bereits im Monorepo nutzbar | Staff-Token-Endpunkt, Login-Umschaltung, Bestellungen-live/Küche-Screens |
| **Fahrer-App** | wie Mitarbeiter-App (gleiche Auth, gleiche Struktur) | Fahrer-Screens + Navigation-Links |
| **Kasse mobil** | Kassen-API existiert bereits vollständig (Roadmap Modul 1) | nur Screens |
| **Online-Zahlung** | Checkout-Zahlarten kommen dynamisch vom Server | erscheint automatisch, sobald Roadmap-Modul 5 umgesetzt ist |

**Keine dieser Vorbereitungen erfordert jetzt Mehraufwand** — es sind Struktur-Entscheidungen (Tabellen-Feld, Ordnerstruktur, austauschbare Bausteine), kein zusätzlicher Code.

---

## 4. Leitplanken & Risiken

- **Unverändert bleiben:** Web-Frontend, alle bestehenden API-Endpunkte, Session-Login, Datenbanktabellen (nur additiv: 1 neue Tabelle)
- **Ein API-Client für Web + App:** alles über OpenAPI + generierte Hooks
- Entwicklung/Test zunächst über Expo-Vorschau (im Browser/Expo Go auf dem eigenen Handy) — **keine Store-Kosten in Phase 1**; App-Store-/Play-Store-Einreichung ist eine eigene spätere Entscheidung (Apple 99 €/Jahr, Google 25 € einmalig)
- Risiko klein: größter Einzelposten ist die Portierung der Options-/Preislogik ins Produktdetail (Phase 1.3) — Vorlage existiert im Web-Code
