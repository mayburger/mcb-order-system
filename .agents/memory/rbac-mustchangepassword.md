---
name: must_change_password enforcement
description: Why forced password change must be enforced server-side AND must exempt the change-password route
---

# Forced password change (mustChangePassword)

Forced password change must be enforced in the backend auth middleware, not only
in the frontend guard. A frontend-only redirect is a client-trust gap: a user
with an initial/reset password can call the staff API directly and operate
normally.

**Rule:** in `requireAuth`, after loading the user, if `mustChangePassword` is
true, return 403 for every guarded endpoint **except** the canonical
change-password route. Match the exemption on **method + normalized path**
(POST, trailing slashes stripped) rather than a loose suffix check, so an
accidental trailing slash can't lock the user out of the one endpoint that
clears the flag.

**Why:** the change-password route also runs `requireAuth`. If you block it too,
you lock out every flagged user — including the seeded owner, who is the only
account that can bootstrap user management. The seed ships with
`must_change_password=true`, so the very first owner login is forced through
change-password before anything else works. `/auth/me` and `/auth/logout` do not
run `requireAuth`, so they stay reachable.

**How to apply:** any time you add another "must do X before using the app" gate,
enforce it server-side in `requireAuth` and whitelist the exact endpoint(s)
needed to satisfy the gate, or you create a deadlock.
