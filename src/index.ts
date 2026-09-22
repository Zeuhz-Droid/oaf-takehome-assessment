import { logInfo } from "./utils/logger.js";

async function bootstrap() {
  logInfo("Initializing backend service...");

  // Express/Fastify server initialization can be placed here
  console.log("🚀 Server started successfully on port 3000");
}

bootstrap().catch((error) => {
  console.error("💥 Fatal error during bootstrap:", error);
  process.exit(1);
});
