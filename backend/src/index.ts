import express from "express";
import cors from "cors";
import { logInfo } from "./utils/logger.js";
import { farmersRouter } from "./routes/farmers.js";

const PORT = process.env.PORT ?? 3000;

async function bootstrap() {
  logInfo("Initializing backend service...");

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.use("/api/farmers", farmersRouter);

  app.listen(PORT, () => {
    console.log(`🚀 Server started successfully on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("💥 Fatal error during bootstrap:", error);
  process.exit(1);
});
