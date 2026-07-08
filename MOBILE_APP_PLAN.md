# Plan: Mobile May Chicken App (iOS + Android)

Stand: 08.07.2026 · Nur Analyse & Planung, keine Umsetzung.
**Grundprinzip: Das bestehende System wird NICHT neu gebaut — die App ist ein zusätzlicher Client auf der vorhandenen API.**

---

## 1. Analyse des Ist-Systems

### 1.1 Aktuelles Frontend
- React + Vite Web-App (`artifacts/may-chicken`), dunkles Design, shadcn/ui-Komponenten
- Kundenbereich: Startseite, Menü, Warenkorb, Checkout, Bestellstatus, Konto (Profil, Bestellungen, Favoriten, Notizen)
- Adminbereich: 20 Seiten unter `/backstage/...` (Dashboard, Bestellungen, Produkte, Küche, Fahrer, …)
- Warenkorb-Logik lebt im Client (`cart-context`) — wiederverwendbares Muster für die App

### 1.2 Routing
- `wouter` mit Basis-Pfad; Admin-Routen über `ProtectedRoute` mit Berechtigungsprüfung (`permission`-Prop)
- Rollen/Berechtigungen zentral in `@workspace/authz` — Server ist die Quelle der Wahrheit, Client spiegelt nur

### 1.3 Login / Authentifizierung
- **Beide Logins (Admin + Kunde) laufen über Server-Sessions mit Cookies** (`express-session`)
- Admin: Session mit Rolle + Berechtigungen, Passwortwechsel-Zwang unterstützt
- Kunde: eigene Session (`customerId`), Registrierung + Login vorhanden
- **Konsequenz für Mobile:** Cookies sind in nativen Apps unzuverlässig → die App braucht **Token-Login (Bearer)** als *zusätzlichen* Weg. Der API-Client ist dafür bereits vorbereitet (`setAuthTokenGetter` hängt automatisch `Authorization: Bearer …` an — laut Code-Kommentar explizit „für Expo“ gedacht). Web bleibt unverändert bei Cookies.

### 1.4 API-Struktur
- Express 5 API (`artifacts/api-server`) unter `/api`, vollständig per **OpenAPI** beschrieben
- Client-Hooks werden generiert (`@workspace/api-client-react`) — **dieselben Hooks funktionieren in React Native**, inkl. `setBaseUrl()` für den Zugriff vom Handy auf den Server
- Alle Fachbereiche vorhanden: Menü, Bestellungen, Kunde, Admin, Küche, Fahrer, Kasse, Berichte

**Fazit der Analyse:** Die Architektur ist ideal für eine Mobile App vorbereitet. Es fehlen nur: (a) Token-Login-Endpunkte, (b) Push-Infrastruktur, (c) die App selbst.

---

## 2. Zielarchitektur

```
┌─────────────────┐     ┌──────────────────┐
│  Web-App (Vite) │     │ Mobile App (Expo) │  ← NEU: ein Codebase für iOS + Android
│  Cookies/Session│     │ Bearer-Token      │
└────────┬────────┘     └────────┬─────────┘
         │   gleiche generierte API-Hooks    │
         └────────────┬───────────┘
                ┌─────▼─────┐
                │  API      │  ← bleibt, nur additive Erweiterungen
                │  Postgres │
                └───────────┘
```

- **Neues Artefakt** `artifacts/may-chicken-mobile` (Expo / React Native, ein Code für iOS **und** Android)
- Wiederverwendet ohne Änderung: `@workspace/api-client-react` (Hooks), `@workspace/authz` (Rollen/Rechte), gesamte Geschäftslogik der API
- Kein bestehendes Modul wird verändert — nur additive API-Erweiterungen

---

## 3. Notwendige Backend-Erweiterungen (additiv)

### 3.1 Token-Login für Mobile
**Neue Tabelle** `restaurant_api_tokens`: id, Typ (staff/customer), user_id bzw. customer_id, Token-Hash, Gerätename, erstellt/läuft ab/zuletzt benutzt, widerrufen.

**Neue Endpunkte** (bestehende Session-Endpunkte bleiben unberührt):
- `POST /auth/token` — Admin/Personal-Login → Token
- `POST /customer/auth/token` — Kunden-Login → Token
- `POST /auth/token/refresh`, `POST /auth/token/revoke` (Logout/Gerät abmelden)
- Bestehende Auth-Middleware wird ergänzt: akzeptiert Session **oder** gültigen Bearer-Token (eine kleine, rückwärtskompatible Erweiterung)

### 3.2 Push Notifications
**Technik:** Expo Push Notifications (ein Dienst für iOS **und** Android, kein eigenes APNs/FCM-Setup nötig).

**Neue Tabelle** `restaurant_push_tokens`: id, Typ (staff/customer), Benutzer-/Kundenreferenz, Expo-Push-Token, Plattform (ios/android), aktiv, Benachrichtigungs-Einstellungen (jsonb), Zeitstempel.

**Neue Endpunkte:**
- `POST /push/register` (Token registrieren), `DELETE /push/unregister`
- `PATCH /push/preferences` (welche Benachrichtigungen gewünscht)

**Versand-Auslöser (Server-seitig, in neue Hilfsfunktion gekapselt):**
| Ereignis | Empfänger |
|---|---|
| Bestellstatus ändert sich (bestätigt → in Zubereitung → unterwegs → fertig) | Kunde |
| Neue Bestellung eingegangen | Admin/Kasse/Küche (je Rolle) |
| Bestellung storniert | Admin |
| Fahrer: neue Lieferung zugewiesen | Fahrer |
| Optional später: Angebote/Marketing (nur mit Opt-in) | Kunde |

### 3.3 Sonstiges
- Keine weiteren API-Änderungen nötig — alle Daten-Endpunkte existieren bereits.

---

## 4. Die Mobile App — Aufbau & Bildschirme

### 4.1 Grundgerüst
- Expo + expo-router (Tab-Navigation), TypeScript
- Design: dunkles Theme wie die Web-App (Markenkonsistenz), touch-optimiert
- Login-Wahl beim Start: **Kunde** (Standard) oder **Mitarbeiter** (versteckter Zugang über Einstellungen)
- Token sicher gespeichert (expo-secure-store), automatischer Re-Login

### 4.2 Kundenbereich (Phase A)
| Bildschirm | Inhalt (nutzt vorhandene API) |
|---|---|
| Start | Highlights, Öffnungsstatus, schneller Einstieg |
| Speisekarte | Kategorien, Produkte, Varianten/Optionen/Extras |
| Warenkorb & Checkout | Lieferung/Abholung, Liefergebiete, Gutscheine, Zahlungsart |
| Bestellstatus | Live-Status + **Push bei jeder Statusänderung** |
| Konto | Registrieren/Login, Profil, Bestellhistorie, Favoriten (Nachbestellen mit 1 Tipp) |
| Einstellungen | Push-Einstellungen, Abmelden |

### 4.3 Adminbereich (Phase B) — bewusst fokussiert, nicht 1:1 die 20 Web-Seiten
Mobile ergänzt das Web-Backoffice, ersetzt es nicht. Fokus auf unterwegs-relevante Funktionen:
| Bildschirm | Inhalt | Recht |
|---|---|---|
| Bestellungen live | Eingehende Bestellungen, Status ändern, **Push bei neuer Bestellung** | `orders.view` |
| Tagesübersicht | Umsatz heute, Bestellanzahl, Kassen-Kurzblick | `dashboard.view` / `cashRegister.view` |
| Küchen-Ansicht | Kompakte Bon-Liste, Status wechseln | `kitchen.view` |
| Fahrer-Ansicht | Zugewiesene Lieferungen, Navigation-Link, Status | `driver.orders.view` |
| Produkt-Schnellzugriff | Produkt ausverkauft/verfügbar schalten | `products.manage` |
- Rollensteuerung identisch zum Web: Anzeige nur bei vorhandener Berechtigung (Server prüft zusätzlich)

### 4.4 iOS & Android Besonderheiten
- Push-Berechtigung wird beim ersten sinnvollen Moment abgefragt (nicht sofort beim Start)
- App-Icons, Splashscreen, Store-Metadaten in beiden Stores
- Veröffentlichung: über Expo-Build-Dienst (EAS) für App Store + Play Store; alternativ zunächst interne Verteilung/Testflight

---

## 5. Umsetzungsphasen & Aufwand

| Phase | Inhalt | Aufwand (ca.) |
|---|---|---|
| **0. Backend-Vorbereitung** | Token-Login, Push-Tabellen + Endpunkte, Versand-Trigger | 1,5–2 Tage |
| **A. Kunden-App** | Grundgerüst, Menü, Warenkorb, Checkout, Konto, Bestellstatus + Push | 4–5 Tage |
| **B. Mitarbeiter-Teil** | Login-Umschaltung, Bestellungen live, Küche, Fahrer, Tagesübersicht | 2–3 Tage |
| **C. Feinschliff & Stores** | Icons, Splash, Push-Feintuning, Store-Einreichung | 1–2 Tage |
| **Gesamt** | | **≈ 9–12 Tage** |

### Abhängigkeiten & Risiken
- Push auf echten Geräten erst nach Store-/EAS-Konfiguration voll testbar (im Simulator eingeschränkt)
- Online-Zahlungen (Roadmap-Modul 5) sind unabhängig; solange nicht umgesetzt, bietet die App dieselben Zahlarten wie das Web (Bar/EC etc.)
- App-Store-Freigaben brauchen Apple-/Google-Entwicklerkonten (Kosten: Apple 99 €/Jahr, Google 25 € einmalig)

### Leitplanken (wie bisher)
- Bestehende Module und das Web-Frontend werden **nicht verändert**
- Alle Backend-Erweiterungen additiv (neue Tabellen/Endpunkte, Session-Login bleibt)
- API weiterhin über OpenAPI + generierte Hooks — Web und App teilen sich denselben Client
