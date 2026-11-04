// POST signed delegate actions to apps/api /relay (A-9.2).
export const relay = async (
  signedDelegate: string,
): Promise<{ txHash: string }> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const res = await fetch(`${apiUrl}/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedDelegate }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Relay failed (${res.status}): ${errBody}`);
  }

  const json = (await res.json()) as { txHash: string };
  return { txHash: json.txHash };
};
