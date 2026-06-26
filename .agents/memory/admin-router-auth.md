---
name: Admin router requireAdmin path scope
description: router.use(requireAdmin) ohne Pfad in admin.ts blockiert alle Requests durch den Router, nicht nur /admin/* Routen
---

## Regel
In `artifacts/api-server/src/routes/admin.ts` muss `requireAdmin` mit Pfad-Präfix verwendet werden:
```ts
router.use("/admin", requireAdmin);  // KORREKT
router.use(requireAdmin);            // FALSCH — blockiert alle Requests
```

**Why:** Der adminRouter ist in `routes/index.ts` ohne Pfad-Präfix gemountet (`router.use(adminRouter)`), daher läuft JEDER Request durch ihn. Ohne Pfad-Scope blockiert `requireAdmin` auch öffentliche Routen wie `/customer/register` und `/customer/login`.

**How to apply:** Wenn neue globale Middleware zum adminRouter hinzugefügt wird, immer mit `/admin` Pfad scopen.
