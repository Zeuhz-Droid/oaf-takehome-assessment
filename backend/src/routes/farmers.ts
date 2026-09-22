import { Router, type Request, type Response } from "express";
import { upsertFarmer, findByPhone, getAllFarmers } from "../db.js";
import { REQUIRED_FIELDS, type Farmer, type SyncResult } from "../types.js";

export const farmersRouter = Router();

function validateFarmer(payload: Partial<Farmer>): string | null {
  for (const field of REQUIRED_FIELDS) {
    if (!payload[field] || String(payload[field]).trim() === "") {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * POST /api/farmers/sync
 * Accepts a single farmer OR an array of farmers (a Field Officer may have
 * several pending records queued up when connectivity returns).
 * Idempotent: re-sending the same farmer id again just returns "duplicate".
 */
farmersRouter.post("/sync", (req: Request, res: Response) => {
  const body = req.body;
  const farmers: Partial<Farmer>[] = Array.isArray(body) ? body : [body];

  const results: SyncResult[] = farmers.map((farmer) => {
    const validationError = validateFarmer(farmer);
    if (validationError) {
      return {
        id: farmer.id ?? "unknown",
        outcome: "invalid",
        message: validationError,
      };
    }

    const { inserted } = upsertFarmer(farmer as Farmer);
    return {
      id: farmer.id as string,
      outcome: inserted ? "synced" : "duplicate",
      message: inserted
        ? "Farmer synced successfully."
        : "Farmer already synced previously — request ignored (idempotent).",
    };
  });

  res.status(200).json({ results });
});

/**
 * GET /api/farmers
 * Admin portal: list of all successfully synced farmers.
 */
farmersRouter.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ farmers: getAllFarmers() });
});

/**
 * GET /api/farmers/check-phone/:phone
 * Lets the client warn "this phone number is already registered" even
 * against farmers synced from OTHER devices/sessions, not just local ones.
 */
farmersRouter.get("/check-phone/:phone", (req: Request, res: Response) => {
  const existing = findByPhone(req.params.phone as string);
  res.status(200).json({ exists: Boolean(existing), farmer: existing ?? null });
});
