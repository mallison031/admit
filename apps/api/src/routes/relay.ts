// POST /relay — accept a signed NEP-366 delegate action, verify, rate-limit, submit (A-8.4).
import { Hono } from "hono";

export const relay = new Hono();
relay.post("/", (c) => c.json({ error: "not implemented: A-8.4" }, 501));
