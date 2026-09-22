import type { LocalFarmer } from "./offlineDb";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export interface SyncResult {
  id: string;
  outcome: "synced" | "duplicate" | "invalid";
  message: string;
}

export async function syncFarmers(
  farmers: LocalFarmer[],
): Promise<SyncResult[]> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const payload = farmers.map(({ status, errorMessage, ...rest }) => rest);
  const res = await fetch(`${API_BASE}/api/farmers/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Sync request failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.results as SyncResult[];
}

export async function checkPhoneOnServer(phone: string): Promise<boolean> {
  const res = await fetch(
    `${API_BASE}/api/farmers/check-phone/${encodeURIComponent(phone)}`,
  );
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.exists);
}

export async function fetchSyncedFarmers() {
  const res = await fetch(`${API_BASE}/api/farmers`);
  if (!res.ok) throw new Error(`Failed to fetch farmers: ${res.status}`);
  const data = await res.json();
  return data.farmers;
}
