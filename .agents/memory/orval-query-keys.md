---
name: Orval-generated React Query keys
description: How to invalidate queries in the may-chicken web app; hand-written string keys silently no-op
---

The web app's data hooks come from orval codegen (lib/api-client-react). Each
list/detail hook exports a sibling `get<Name>QueryKey()` whose key is the
request-path array, e.g. `['/api/admin/inventory']` — NOT a hand-written slug
like `['listInventory']`.

**Rule:** always invalidate with the generated `get<Name>QueryKey(...)`, never
an ad-hoc string key.

**Why:** a hand-written `queryKey: ['listInventory']` matches nothing, so
`invalidateQueries` silently no-ops and the table shows stale data until a
window-focus refetch. This hid newly-saved inventory fields after create/edit.

**How to apply:** when adding create/update/delete/movement mutations, import
the sibling `get...QueryKey` from `@workspace/api-client-react` and pass it to
`qc.invalidateQueries`.
