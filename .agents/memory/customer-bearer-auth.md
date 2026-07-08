---
name: Kunden-Bearer-Auth (Mobile)
description: Wie die Mobile-App-Authentifizierung neben der Web-Cookie-Session funktioniert und was dabei zu beachten ist.
---

# Kunden-Auth: Cookie-Session (Web) + Bearer-Token (Mobile)

Regel: Kundenrouten dürfen NIE direkt `req.session.customerId` lesen — immer den
Resolver verwenden (Session zuerst, dann Bearer-Hash-Lookup). Sonst funktionieren
Mobile-Clients nicht.

**Why:** Expo/Mobile kann keine Cookies über den Proxy nutzen; Login/Register geben
nur bei Header `x-client: mobile` ein Token zurück (Web bleibt unverändert, kein
Token im Web-Response). In der DB liegt nur der SHA-256-Hash; TTL wird serverseitig
erzwungen (90 Tage absolut, 30 Tage idle) und abgelaufene Tokens werden beim Lookup
gelöscht. Bei künftigen Passwort-Änder-/Reset-Endpunkten alle Tokens des Kunden
widerrufen (Helper existiert bereits).

**How to apply:** Jede neue kundenbezogene Route (auch außerhalb von /customer/*,
z. B. Order-Erstellung) muss den Resolver nutzen, damit Web UND Mobile funktionieren.

# Drizzle push: Name-Truncation-Falle

`drizzle-kit push` fragt interaktiv (non-TTY = Abbruch), wenn ein Constraint-Name
länger als 63 Zeichen ist: Postgres kürzt den Namen, drizzle vergleicht den vollen
Namen → ewiger Diff, der Prompt kommt bei JEDEM push wieder. Lösung: Constraint-
namen kurz halten oder die Änderung manuell per SQL anlegen (push diffed nur die
Live-DB, manuelles SQL ist safe).
