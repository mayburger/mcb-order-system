---
name: GitHub-Push über Replit-Connector
description: Wie man in diesem Projekt zu GitHub pusht, wenn die normale Git-Auth fehlschlägt.
---

# GitHub-Push über den Replit-Connector

Regel: `git push origin main` schlägt hier mit "Invalid username or token" fehl —
das HTTPS-Remote hat keine eingebauten Credentials. Push funktioniert mit Token
aus dem Connector-Credential-Proxy:
`https://$REPLIT_CONNECTORS_HOSTNAME/api/v2/connection?include_secrets=true&connector_names=github`
mit Header `X_REPLIT_TOKEN: repl $REPL_IDENTITY`, dann
`git push https://x-access-token:<token>@github.com/<owner>/<repo>.git main`
(Token im Output maskieren, nie loggen).

**Why:** Die GitHub-Verbindung war zunächst nur auf Kontoebene autorisiert
(Status "not_added") → Proxy antwortete 401 und auch `listConnections('github')`
in der Sandbox schlug fehl. Erst nach Projekt-Verknüpfung der Integration
(inkl. User-Bestätigung) liefert der Proxy das Token.

**How to apply:** Bei 401 vom Connector-Proxy zuerst den Verbindungsstatus
prüfen — "not_added" heißt: Integration mit dem Projekt verknüpfen und vom
User bestätigen lassen, nicht nach API-Keys fragen.
