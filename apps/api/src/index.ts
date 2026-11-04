// Admit API: relayer + quote proxy (ARCHITECTURE §9). No secrets in logs (A-8.6).
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { relay } from "./routes/relay.js";
import { onboard } from "./routes/onboard.js";
import { quote } from "./routes/quote.js";

const app = new Hono();
app.get("/health", (c) => c.json({ ok: true }));
app.route("/relay", relay);
app.route("/onboard", onboard);
app.route("/quote", quote);

// TODO(A-8.1): loadEnv() + port from env
serve({ fetch: app.fetch, port: 8787 });
