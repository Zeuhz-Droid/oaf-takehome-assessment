export interface Farmer {
  id: string; // client-generated UUID — this is what makes sync idempotent
  name: string;
  phone: string;
  state: string;
  village: string;
  programme: string;
  syncedAt?: string;
}

export type SyncOutcome = "synced" | "duplicate" | "invalid";

export interface SyncResult {
  id: string;
  outcome: SyncOutcome;
  message: string;
}

export const REQUIRED_FIELDS: (keyof Farmer)[] = [
  "id",
  "name",
  "phone",
  "state",
  "village",
  "programme",
];
