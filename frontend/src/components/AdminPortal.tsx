import { useEffect, useState, useCallback } from "react";
import { fetchSyncedFarmers, type SyncedFarmerRow } from "../lib/api";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

export function AdminPortal() {
  const [farmers, setFarmers] = useState<SyncedFarmerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced value actually sent to the server
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce: don't fire a request on every keystroke — wait for a pause.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1); // a new search always starts back at page 1
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSyncedFarmers({
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setFarmers(result.farmers);
      setTotal(result.total);
    } catch {
      setError(
        "Couldn't reach the server. The admin portal needs connectivity — it only shows records the server already has.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, page * PAGE_SIZE);

  return (
    <section className="admin-portal">
      <div className="farmer-list-header">
        <h2>Admin — synced farmers</h2>
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="Search by name, phone, or village…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <span className="result-count">
          {total === 0
            ? "No results"
            : `Showing ${rangeStart}–${rangeEnd} of ${total.toLocaleString()}`}
        </span>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll">
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
                  {search
                    ? "No farmers match that search."
                    : "No farmers have been synced to the server yet."}
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
            disabled={page <= 1 || loading}
          >
            ← Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
