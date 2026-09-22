import { useEffect, useState, useCallback } from "react";
import { fetchSyncedFarmers } from "../lib/api";

interface SyncedFarmer {
  id: string;
  name: string;
  phone: string;
  state: string;
  village: string;
  programme: string;
  synced_at: string;
}

export function AdminPortal() {
  const [farmers, setFarmers] = useState<SyncedFarmer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSyncedFarmers();
      setFarmers(data);
    } catch {
      setError(
        "Couldn't reach the server. The admin portal needs connectivity — this view has nothing to do offline since it only shows records the server already has.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <section className="admin-portal">
      <div className="farmer-list-header">
        <h2>Admin — synced farmers</h2>
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>State</th>
            <th>Village</th>
            <th>Programme</th>
            <th>Synced at</th>
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
              <td>{new Date(f.synced_at).toLocaleString()}</td>
            </tr>
          ))}
          {farmers.length === 0 && !loading && (
            <tr>
              <td colSpan={6}>
                No farmers have been synced to the server yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
