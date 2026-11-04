// POST /onboard/device — device pairing flow; returns no secrets (A-8.5).
import { Hono } from "hono";
import { z } from "zod";

export const onboard = new Hono();

const OnboardRequest = z.object({
  devicePublicKey: z.string().min(1, "devicePublicKey is required"),
  memberAccount: z.string().min(2).max(64, "memberAccount is required"),
});

onboard.post("/device", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = OnboardRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, 400);
  }

  const { devicePublicKey, memberAccount } = parsed.data;

  return c.json({
    ok: true,
    devicePublicKey,
    memberAccount,
    instructions: "Scan QR code or approve delegate key addition in wallet",
    method: "add_delegate",
  });
});
