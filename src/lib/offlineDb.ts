import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type FarmerStatus = "pending" | "synced" | "failed";

export interface LocalFarmer {
  id: string;
  name: string;
  phone: string;
  state: string;
  village: string;
  programme: string;
  status: FarmerStatus;
  createdAt: string;
  errorMessage?: string;
}

interface OAFDBSchema extends DBSchema {
  farmers: {
    key: string;
    value: LocalFarmer;
    indexes: { "by-phone": string; "by-status": string };
  };
}

let dbPromise: Promise<IDBPDatabase<OAFDBSchema>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OAFDBSchema>("oaf-farmers-db", 1, {
      upgrade(db) {
        const store = db.createObjectStore("farmers", { keyPath: "id" });
        store.createIndex("by-phone", "phone");
        store.createIndex("by-status", "status");
      },
    });
  }
  return dbPromise;
}

export function generateFarmerId(): string {
  return crypto.randomUUID();
}

export async function addFarmer(
  farmer: Omit<LocalFarmer, "status" | "createdAt">,
): Promise<LocalFarmer> {
  const db = await getDb();
  const record: LocalFarmer = {
    ...farmer,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await db.add("farmers", record);
  return record;
}

export async function getAllFarmers(): Promise<LocalFarmer[]> {
  const db = await getDb();
  return db.getAll("farmers");
}

export async function getPendingFarmers(): Promise<LocalFarmer[]> {
  const db = await getDb();
  return db.getAllFromIndex("farmers", "by-status", "pending");
}

/** Local duplicate-phone check against records already saved on this device. */
export async function findLocalFarmerByPhone(
  phone: string,
): Promise<LocalFarmer | undefined> {
  const db = await getDb();
  return db.getFromIndex("farmers", "by-phone", phone);
}

export async function updateFarmerStatus(
  id: string,
  status: FarmerStatus,
  errorMessage?: string,
): Promise<void> {
  const db = await getDb();
  const record = await db.get("farmers", id);
  if (!record) return;
  await db.put("farmers", { ...record, status, errorMessage });
}
