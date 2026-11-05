// Admit API: relayer + quote proxy (ARCHITECTURE §9). No secrets in logs (A-8.6).
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { relay } from "./routes/relay.js";
import { onboard } from "./routes/onboard.js";
import { quote } from "./routes/quote.js";
import { ai } from "./routes/ai.js";
import { loadEnv } from "./env.js";

export const app = new Hono();
app.get("/health", (c) => c.json({ ok: true }));
app.route("/relay", relay);
app.route("/onboard", onboard);
app.route("/quote", quote);
app.route("/ai", ai);

// Start server when executed directly as entrypoint
const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const env = loadEnv();
  console.log(`Starting API server on port ${env.API_PORT} for network ${env.NEAR_NETWORK}...`);
  serve({ fetch: app.fetch, port: env.API_PORT });
}
