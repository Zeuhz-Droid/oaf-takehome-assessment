import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getAllFarmers,
  getSyncableFarmers,
  updateFarmerStatus,
  type LocalFarmer,
} from "../lib/offlineDb";
import { syncFarmers } from "../lib/api";

interface Props {
  isOnline: boolean;
  refreshKey: number;
}

type StatusFilter = "all" | LocalFarmer["status"];

const STATUS_LABEL: Record<LocalFarmer["status"], string> = {
  pending: "⏳ Pending",
  synced: "✅ Synced",
  failed: "❌ Failed",
};

const STATUS_CLASS: Record<LocalFarmer["status"], string> = {
  pending: "status-pending",
  synced: "status-synced",
  failed: "status-failed",
};

const PAGE_SIZE = 20;

export function FarmerList({ isOnline, refreshKey }: Props) {
  const [farmers, setFarmers] = useState<LocalFarmer[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const reload = useCallback(async () => {
    setFarmers(await getAllFarmers());
  }, []);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  const counts = useMemo(() => {
    return {
      all: farmers.length,
      pending: farmers.filter((f) => f.status === "pending").length,
      synced: farmers.filter((f) => f.status === "synced").length,
      failed: farmers.filter((f) => f.status === "failed").length,
    };
  }, [farmers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return farmers.filter((f) => {
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;
      const matchesSearch =
        !term ||
        f.name.toLowerCase().includes(term) ||
        f.phone.toLowerCase().includes(term) ||
        f.village.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [farmers, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function runSync(toSync: LocalFarmer[]) {
    if (toSync.length === 0) return { succeeded: 0, total: 0 };
    try {
      const results = await syncFarmers(toSync);
      for (const result of results) {
        if (result.outcome === "synced" || result.outcome === "duplicate") {
          await updateFarmerStatus(result.id, "synced");
        } else {
          await updateFarmerStatus(result.id, "failed", result.message);
        }
      }
      const succeeded = results.filter((r) => r.outcome !== "invalid").length;
      return { succeeded, total: toSync.length };
    } catch {
      await Promise.all(
        toSync.map((f) =>
          updateFarmerStatus(f.id, "failed", "Could not reach server."),
        ),
      );
      return { succeeded: 0, total: toSync.length, networkError: true };
    }
  }

  async function handleSyncAll() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const toSync = await getSyncableFarmers();
      if (toSync.length === 0) {
        setSyncMessage("Nothing to sync.");
        return;
      }
      const { succeeded, total, networkError } = await runSync(toSync);
      setSyncMessage(
        networkError
          ? "Sync failed — server unreachable. Will retry later."
          : `Synced ${succeeded} of ${total} farmer(s).`,
      );
      await reload();
    } finally {
      setSyncing(false);
    }
  }

  async function handleRetryOne(farmer: LocalFarmer) {
    setRetryingId(farmer.id);
    try {
      const { succeeded, networkError } = await runSync([farmer]);
      setSyncMessage(
        networkError
          ? `Retry failed for ${farmer.name} — server unreachable.`
          : succeeded
            ? `${farmer.name} synced.`
            : `Retry for ${farmer.name} was rejected by the server.`,
      );
      await reload();
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <section className="farmer-list">
      <div className="farmer-list-header">
        <h2>Farmers on this device</h2>
        <button
          onClick={handleSyncAll}
          disabled={
            !isOnline || syncing || counts.pending + counts.failed === 0
          }
          title={
            !isOnline ? "You're offline — can't sync right now" : undefined
          }
        >
          {syncing
            ? "Syncing…"
            : `Sync now (${counts.pending + counts.failed} to send)`}
        </button>
      </div>

      <div className="status-tabs">
        {(["all", "pending", "failed", "synced"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            className={statusFilter === s ? "chip chip-active" : "chip"}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]} ({counts[s]})
          </button>
        ))}
      </div>

      <input
        type="search"
        className="local-search"
        placeholder="Search by name, phone, or village…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {syncMessage && <p className="sync-message">{syncMessage}</p>}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>State</th>
              <th>Village</th>
              <th>Programme</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.phone}</td>
                <td>{f.state}</td>
                <td>{f.village}</td>
                <td>{f.programme}</td>
                <td className={STATUS_CLASS[f.status]} title={f.errorMessage}>
                  {STATUS_LABEL[f.status]}
                </td>
                <td>
                  {f.status === "failed" && (
                    <button
                      className="retry-btn"
                      onClick={() => handleRetryOne(f)}
                      disabled={!isOnline || retryingId === f.id}
                      title={
                        !isOnline
                          ? "You're offline — can't retry right now"
                          : f.errorMessage
                      }
                    >
                      {retryingId === f.id ? "Retrying…" : "Retry"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7}>
                  {farmers.length === 0
                    ? "No farmers registered on this device yet."
                    : "No farmers match this filter/search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
