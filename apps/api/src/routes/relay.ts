// POST /relay — accept a signed NEP-366 delegate action, verify, rate-limit, submit (A-8.4).
import { Hono } from "hono";
import { z } from "zod";
import { verifyDelegate } from "../relayer/verify.js";
import { allow } from "../relayer/ratelimit.js";
import { submitDelegate } from "../relayer/submit.js";
import { loadEnv } from "../env.js";

export const relay = new Hono();

const RelayRequest = z.object({
  signedDelegate: z.string().min(1, "signedDelegate is required"),
});

relay.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = RelayRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, 400);
  }

  let env;
  try {
    env = loadEnv();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Environment config error: ${msg}` }, 500);
  }

  const verifyResult = verifyDelegate(parsed.data.signedDelegate, env.ADMIT_CONTRACT);
  if (!verifyResult.ok) {
    return c.json({ error: verifyResult.reason ?? "Verification failed" }, 400);
  }

  const signer = verifyResult.senderId ?? "unknown";
  if (!allow(signer)) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  try {
    const { txHash } = await submitDelegate(parsed.data.signedDelegate, env);
    return c.json({ ok: true, txHash });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Transaction submission failed: ${message}` }, 500);
  }
});
