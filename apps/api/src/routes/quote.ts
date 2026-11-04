// POST /quote — 1Click /v0/quote with dry:true (Could, A-8.7).
import { Hono } from "hono";

export const quote = new Hono();
quote.post("/", (c) => c.json({ error: "not implemented: A-8.7" }, 501));
