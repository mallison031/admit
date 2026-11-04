"use client";
// QR verification page (A-9.4). RPC view calls ONLY — must work with the API turned off (ARCHITECTURE §8).
import { useParams } from "next/navigation";

export default function GuaranteePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <main>
      <h1>Guarantee #{id}</h1>
      <p>Not implemented yet (A-9.4): status banner, amount, expiry, code check, accept.</p>
    </main>
  );
}
