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

export interface SyncedFarmerRow {
  id: string;
  name: string;
  phone: string;
  state: string;
  village: string;
  programme: string;
  synced_at: string;
}

export interface FarmersPage {
  farmers: SyncedFarmerRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FetchFarmersParams {
  search?: string;
  state?: string;
  programme?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchSyncedFarmers(
  params: FetchFarmersParams = {},
): Promise<FarmersPage> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.state) qs.set("state", params.state);
  if (params.programme) qs.set("programme", params.programme);
  qs.set("page", String(params.page ?? 1));
  qs.set("pageSize", String(params.pageSize ?? 25));

  const res = await fetch(`${API_BASE}/api/farmers?${qs.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch farmers: ${res.status}`);
  return res.json();
}
