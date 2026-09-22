import { Router, type Request, type Response } from "express";
import { upsertFarmer, findByPhone, getFarmersPage } from "../db.js";
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

farmersRouter.get("/", (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page ?? "1"), 10) || 1;
  const pageSize = parseInt(String(req.query.pageSize ?? "25"), 10) || 25;

  const result = getFarmersPage({
    page,
    pageSize,
    search: req.query.search ? String(req.query.search) : undefined,
    state: req.query.state ? String(req.query.state) : undefined,
    programme: req.query.programme ? String(req.query.programme) : undefined,
  });

  res.status(200).json(result);
});

farmersRouter.get("/check-phone/:phone", (req: Request, res: Response) => {
  const existing = findByPhone(req.params.phone);
  res.status(200).json({ exists: Boolean(existing), farmer: existing ?? null });
});
