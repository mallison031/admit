// POST /onboard/device — device pairing flow; returns no secrets (A-8.5).
import { Hono } from "hono";

export const onboard = new Hono();
onboard.post("/device", (c) => c.json({ error: "not implemented: A-8.5" }, 501));
