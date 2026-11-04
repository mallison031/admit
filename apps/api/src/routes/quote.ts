// POST /quote — 1Click /v0/quote with dry:true (Could, A-8.7).
import { Hono } from "hono";
import { z } from "zod";

export const quote = new Hono();

const QuoteRequest = z.object({
  defuseAssetIdIn: z.string().min(1),
  defuseAssetIdOut: z.string().min(1),
  amountIn: z.string().regex(/^\d+$/),
  recipient: z.string().optional(),
});

quote.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = QuoteRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, 400);
  }

  try {
    const payload = {
      ...parsed.data,
      dry: true,
    };

    const res = await fetch("https://1click.chaindefuser.com/v0/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return c.json(
        { error: `Quote provider returned ${res.status}: ${errText}` },
        502,
      );
    }

    const data: unknown = await res.json();
    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Failed to fetch quote: ${msg}` }, 502);
  }
});
