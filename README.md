# OAF Farmer Registration Prototype

An offline-first prototype letting a Field Officer register farmers without
connectivity, sync them once online, and view synced records through a
simple admin portal.

> This is a 4-hour take-home prototype, not production-ready software.
> See **Assumptions & limitations** below for what was deliberately left out.

## How to run it

**Requirements:** Node.js 20+, npm.

**Backend**

```bash
cd backend
npm install
npm install express cors better-sqlite3
npm install -D @types/express @types/cors @types/better-sqlite3
npm run dev
```

Runs on `http://localhost:3000`. Confirm it's up: `GET /health` → `{"status":"ok"}`.
A SQLite file (`backend/data.sqlite`) is created automatically on first run.

**Frontend**

```bash
cd frontend
npm install
npm install idb
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`). If your API
runs somewhere other than `localhost:3000`, set `VITE_API_BASE_URL` in a
`.env` file in `frontend/`.

No deployed link is included — both parts run locally with the steps above.

## Technology stack

| Layer              | Choice                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend           | React + TypeScript + Vite                                                                                                                    |
| Offline storage    | IndexedDB via the `idb` library                                                                                                              |
| Backend            | Node.js + Express + TypeScript                                                                                                               |
| Server storage     | SQLite via `better-sqlite3`                                                                                                                  |
| Offline simulation | `navigator.onLine` events + an in-app manual toggle (DevTools' Network→Offline also works)                                                   |
| Scale handling     | Server-side search + pagination on the admin dashboard; client-side status filters, search, and pagination on the Field Officer's local list |

## How to test the offline & sync behaviour

1. Start both servers (above). You'll see a green "Online" badge.
2. Click **"Simulate: go offline"**, register a farmer. It saves with status
   **Pending** — the Sync button disables.
3. Click **"Simulate: go back online"**, click **Sync now**. Status flips to
   **Synced**. Switch to the **Admin Portal** tab and refresh — it appears
   there, confirming it actually reached the server.
4. Stop the backend process, register or retry a farmer — status becomes
   **Failed** with a visible reason, not a silent hang. Restart the backend
   and click the row's **Retry** button (or **Sync now**) — it recovers to
   **Synced** without needing to be re-entered.
5. Try registering the same phone number twice — blocked locally even
   offline. Try it again from a different browser/incognito profile once
   the first is synced — blocked by a server-side check.
6. Idempotency check: re-send an already-synced farmer's sync request (e.g.
   replay the network request in DevTools). The server returns `duplicate`
   and no second row is created in `data.sqlite`.

A fuller edge-case table (9 cases, each with expected result) is tracked in
[`DECISION_LOG.md`](./DECISION_LOG.md) under "Test log," including
server-down and cross-device scenarios.

## Key assumptions & limitations

- **Programme is a fixed dropdown** (Maize, Poultry, Soybean, Rice, Cassava)
  — the brief doesn't specify a real OAF programme list, so this is a
  placeholder set, not authoritative.
- **Phone validation is a loose format check** (digits, `+`, spaces, 7–15
  chars), not a proper Nigerian phone-number validator — chosen to avoid
  false rejections given varying real-world formats.
- **Sync is manual, not automatic on reconnect.** A "Sync now" button was
  chosen deliberately over auto-syncing on the browser's `online` event, so
  the offline→online behaviour stays clearly demonstrable rather than
  happening invisibly in the background.
- **No routing library.** Two views (Field Officer / Admin) are switched
  with a plain tab state in `App.tsx` rather than `react-router-dom` — not
  worth the setup time for two screens.
- **Admin portal is read-only and requires connectivity** — it only shows
  what the server actually has, and shows an explicit error state offline
  rather than merging in local pending/failed records.
- **No authentication** on the admin portal or API — anyone with the URL can
  view or post farmer records. Fine for a local prototype, not for
  production.
- **SQLite, not a production database.** Single file, no migrations
  tooling, no concurrent-write considerations beyond what better-sqlite3
  handles by default.
- **Search uses SQL `LIKE`, not full-text search.** Fine at realistic
  prototype scale; a production deployment with tens of thousands of
  farmers would want SQLite FTS5 or a dedicated search index, since a
  leading-wildcard `LIKE` can't use a regular index.
- **Testing is manual**, not automated (no Jest/Vitest suite). Given the
  4-hour scope, manual verification of the edge cases above was prioritized
  over writing and maintaining a test harness.

## AI tools used

This prototype was built with **Claude** (Anthropic) as an AI pair-programmer
throughout, used for:

- Scaffolding the Express + TypeScript backend (schema, routes, the
  upsert-by-id idempotency logic)
- Generating the IndexedDB offline-storage layer (`idb`-based helpers)
- Generating the registration form, sync-trigger UI, and admin portal
  components
- Diagnosing and fixing a CSS-specificity bug causing low text contrast
- Drafting this README and the accompanying decision log

I reviewed, tested, and adjusted all AI-generated code before committing it; architecture
decisions (see `DECISION_LOG.md`) were made and confirmed by me; I ran the
manual test pass above myself. 
