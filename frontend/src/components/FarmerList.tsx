import { useEffect, useState, useCallback } from "react";
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

export function FarmerList({ isOnline, refreshKey }: Props) {
  const [farmers, setFarmers] = useState<LocalFarmer[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setFarmers(await getAllFarmers());
  }, []);

  useEffect(() => {
    let cancelled = false;

    getAllFarmers().then((loadedFarmers) => {
      if (!cancelled) setFarmers(loadedFarmers);
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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

  const syncableCount = farmers.filter(
    (f) => f.status === "pending" || f.status === "failed",
  ).length;

  return (
    <section className="farmer-list">
      <div className="farmer-list-header">
        <h2>Farmers on this device</h2>
        <button
          onClick={handleSyncAll}
          disabled={!isOnline || syncing || syncableCount === 0}
          title={
            !isOnline ? "You're offline — can't sync right now" : undefined
          }
        >
          {syncing ? "Syncing…" : `Sync now (${syncableCount} to send)`}
        </button>
      </div>

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
            {farmers.map((f) => (
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
            {farmers.length === 0 && (
              <tr>
                <td colSpan={7}>No farmers registered on this device yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
