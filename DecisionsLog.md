# Decision Log — OAF Farmer Registration Prototype

Purpose: if you run out of tokens/messages and have to switch AI assistant or
account mid-build, paste this whole file as the first message to the new
session. It should be able to pick up exactly where the last one left off.

## Project state as of this log

- Backend: Express + TypeScript (NodeNext), better-sqlite3, `src/index.ts`,
  `src/db.ts`, `src/types.ts`, `src/routes/farmers.ts` — DONE.
- Frontend: Vite + React + TypeScript, IndexedDB helpers via `idb` in
  `src/lib/offlineDb.ts` — DONE.
- Registration form (`components/RegistrationForm.tsx`) with validation +
  two-layer duplicate phone check — DONE.
- Online/offline detection + manual toggle (`hooks/useOnlineStatus.ts`),
  sync trigger + status table (`components/FarmerList.tsx`) — DONE.
- Admin portal (`components/AdminPortal.tsx`), wired into `App.tsx` via a
  plain tab switcher — DONE.
- Not yet built/done: edge-case testing pass, README.

## Key architecture decisions (don't re-litigate these)

1. **Idempotent sync via client-generated ID.** The farmer's `id` is a
   `crypto.randomUUID()` created the moment it's saved offline, not by the
   server. The server table's primary key is that same id, and sync uses
   `INSERT OR IGNORE`. Replaying the same sync request is a safe no-op.
   This is what satisfies "prevent duplicate records if the same sync
   request is sent more than once."

2. **Server only stores synced farmers.** Pending/failed states live purely
   in the browser's IndexedDB. The server has no concept of "pending" — a
   farmer either isn't there yet, or it's synced. Keeps the backend simple.

3. **Offline simulation = `navigator.onLine` + manual UI toggle**, not a
   full service-worker PWA. A real PWA offline-shell wasn't worth the time
   budget for a 4-hour prototype; the exercise explicitly allows DevTools
   or a toggle.

4. **Duplicate phone warning is two-layer:** check IndexedDB locally first
   (`findLocalFarmerByPhone`) for instant feedback while offline, and
   optionally hit `GET /api/farmers/check-phone/:phone` once online to catch
   phones already synced from a different device/session.

5. **Batch-friendly sync endpoint.** `POST /api/farmers/sync` accepts either
   one farmer object or an array, so a Field Officer with several pending
   records can sync them all in one request when connectivity returns.

6. **Programme is a fixed dropdown** (Maize, Poultry, Soybean, Rice,
   Cassava), not a free-text field. The brief doesn't specify a real OAF
   programme list, so this is an assumption — flag it as such in the
   README, don't present it as authoritative.

7. **Phone number validated with a loose regex** (`^[0-9+ ]{7,15}$`) —
   digits, `+`, spaces, 7–15 chars. This is intentionally permissive
   because Nigerian phone formats vary (with/without country code, leading
   0, spacing). It catches obvious garbage (letters, too short) without
   rejecting valid real-world input. Note this as a limitation, not a
   proper phone-format validator.

8. **No auto-sync on the `online` event.** Sync is a manual "Sync now"
   button, not automatically triggered the instant the browser fires
   `online`. Chosen deliberately: auto-sync is harder to demo/prove to an
   assessor ("did it actually wait for offline, or did it just always
   sync?") and manual control keeps the offline→online transition visibly
   testable. Documented as a design choice, not a missed requirement.

9. **Admin portal uses a plain tab switcher in `App.tsx`, not
   `react-router-dom`.** Two views total didn't justify adding and
   configuring a routing library inside a 4-hour time budget. If asked
   "why no routing," this is a defensible, deliberate trade-off.

10. **Admin portal is read-only and server-only** — it calls `GET
/api/farmers` directly and shows an explicit error state when offline,
    rather than trying to merge in local pending/failed records. The brief
    asks it to show "farmers that have been successfully synced," which by
    definition only exist server-side.

11. **Root cause of the low-contrast header bug:** Vite's default
    `index.css` template sets `:root { color-scheme: light dark; color:
rgba(255,255,255,0.87); }`, meant for its dark-mode boilerplate. `:root`
    has higher CSS specificity than a plain `body` selector, so
    `body { color: #1f2320 }` in App.css was silently losing to it —
    unstyled headings (h1/h2) rendered near-white on white cards.
    Fixed by replacing `index.css` with a light-only reset (`color-scheme:
light`, explicit `:root` color) and adding CSS custom-property tokens
    in App.css so every color is intentional, not inherited by accident.

12. **Retry logic for failed syncs, no re-entry required.** Failed records
    were never deleted from IndexedDB — they were always sitting there with
    `status: 'failed'` and an error message. The gap was purely on the sync
    side: `getPendingFarmers()` only ever fetched `status === 'pending'`, so
    a failed record was silently never retried. Fixed by adding
    `getSyncableFarmers()` (pending + failed) and using it for bulk "Sync
    now", plus a per-row "Retry" button for failed records so an officer can
    retry a single one without re-syncing everything. Sync logic was
    refactored into a shared `runSync()` used by both paths — no duplicated
    retry logic to keep in sync (no pun intended).

13. **Responsive pass:** breakpoint at 600px — header stacks, tabs get more
    tap-friendly padding, buttons go full-width, and both farmer tables are
    wrapped in a `.table-scroll` div (`overflow-x: auto`) so wide tables
    scroll horizontally on a phone instead of squeezing/breaking the layout.
    Chosen over a card-based mobile table redesign — same data, less time,
    the brief doesn't ask for a specific mobile pattern.

14. **Pagination and search added for scale**, after realizing the admin
    portal fetched and rendered every synced farmer in one request — fine
    for a demo, unusable past a few hundred records. Fixed at the SQL level:
    `GET /api/farmers` now takes `search`, `state`, `programme`, `page`,
    `pageSize` and does the filtering + `LIMIT/OFFSET` in the database, not
    in the browser after fetching everything. The Field Officer's own local
    list got the equivalent treatment client-side (status filter chips,
    search, pagination) since a device can accumulate plenty of records
    over weeks of use.
    **Known limitation, documented not fixed:** `LIKE '%term%'` can't use an
    index, so at real production scale (tens of thousands+ rows) this would
    want SQLite FTS5 or a proper search index. Fine for a prototype's
    realistic scale; flagged honestly rather than silently left as a
    correctness risk.

## Still to decide / do

- [x] Registration form component + client-side validation UX
- [x] Sync trigger UI (manual button, see decision 8 above)
- [x] Admin portal: plain tab switcher, no router (see decision 9)
- [x] Contrast bug fixed, responsive pass done, retry logic added (11-13)
- [x] Search, filtering, and server-side pagination for scale (14)
- [ ] Edge-case test pass (in progress — see Test Log below)
- [ ] README: run instructions, stack, offline/sync test steps, assumptions,
      AI tools disclosure (REQUIRED by the brief — don't skip this)

## Test log (w RESULTS)

| #   | Edge case                                                                                         | Expected                                                                          | Result |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------ |
| 1   | Submit form with a blank field                                                                    | Blocked, inline error, nothing saved                                              | ✅     |
| 2   | Register same phone number twice (same device)                                                    | Second attempt blocked by local IndexedDB check                                   | ✅     |
| 3   | Register a phone that's already synced (different device/session)                                 | Blocked by server-side check-phone call, only while online                        | ✅     |
| 4   | Toggle "Simulate: go offline", save a farmer                                                      | Saves fine, status = pending, Sync button disabled                                | ✅     |
| 5   | Go back online, click Sync now                                                                    | Pending → synced, appears in Admin Portal after refresh                           | ✅     |
| 6   | Click Sync now twice on an already-synced farmer (re-trigger manually, e.g. via devtools/re-POST) | Server returns "duplicate", client still shows synced, no duplicate row in SQLite | ✅     |
| 7   | Kill the backend process, click Sync now                                                          | Pending → failed, error visible, no crash                                         | ✅     |
| 8   | Restart backend, Sync now again                                                                   | Failed → synced (retry works)                                                     | ✅     |
| 9   | View Admin Portal while offline                                                                   | Explicit error message, not a blank/broken table                                  | ✅     |
