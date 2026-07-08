---
name: Replit iOS-App Session-Sperre für Mobile-Artefakte
description: createArtifact(expo) schlägt fehl, wenn die User-Sitzung aus der Replit-iOS-App kommt
---

`createArtifact({artifactType: "expo", ...})` returns `success: false` with
"Creating mobile apps is not supported in the iOS Replit app" when the user's
session originates from the Replit iOS app.

**Why:** Platform restriction, per session — not fixable agent-side. Retrying
from the same session fails identically.

**How to apply:** Ask the user to open the project on replit.com in a browser
and send their next message from there; the restriction lifts once the session
comes from the browser (an automatic_updates note confirms it). Do not scaffold
the Expo artifact manually as a workaround.
