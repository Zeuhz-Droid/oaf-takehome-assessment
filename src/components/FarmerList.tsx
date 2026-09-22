import { useEffect, useState, useCallback } from "react";
import {
  getAllFarmers,
  getPendingFarmers,
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

export function FarmerList({ isOnline, refreshKey }: Props) {
  const [farmers, setFarmers] = useState<LocalFarmer[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const data = await getAllFarmers();
    setFarmers(data);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      const data = await getAllFarmers();
      if (!ignore) {
        setFarmers(data);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const pending = await getPendingFarmers();
      if (pending.length === 0) {
        setSyncMessage("Nothing to sync.");
        return;
      }

      const results = await syncFarmers(pending);

      for (const result of results) {
        if (result.outcome === "synced" || result.outcome === "duplicate") {
          await updateFarmerStatus(result.id, "synced");
        } else {
          await updateFarmerStatus(result.id, "failed", result.message);
        }
      }

      const succeeded = results.filter((r) => r.outcome !== "invalid").length;
      setSyncMessage(`Synced ${succeeded} of ${pending.length} farmer(s).`);
      await reload();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: Error | any) {
      console.log(err?.message);
      const pending = await getPendingFarmers();
      await Promise.all(
        pending.map((f) =>
          updateFarmerStatus(f.id, "failed", "Could not reach server."),
        ),
      );
      setSyncMessage("Sync failed — server unreachable. Will retry later.");
      await reload();
    } finally {
      setSyncing(false);
    }
  }

  const pendingCount = farmers.filter((f) => f.status === "pending").length;

  return (
    <section className="farmer-list">
      <div className="farmer-list-header">
        <h2>Farmers on this device</h2>
        <button
          onClick={handleSync}
          disabled={!isOnline || syncing || pendingCount === 0}
          title={
            !isOnline ? "You're offline — can't sync right now" : undefined
          }
        >
          {syncing ? "Syncing…" : `Sync now (${pendingCount} pending)`}
        </button>
      </div>

      {syncMessage && <p className="sync-message">{syncMessage}</p>}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>State</th>
            <th>Village</th>
            <th>Programme</th>
            <th>Status</th>
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
              <td title={f.errorMessage}>{STATUS_LABEL[f.status]}</td>
            </tr>
          ))}
          {farmers.length === 0 && (
            <tr>
              <td colSpan={6}>No farmers registered on this device yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
