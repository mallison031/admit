// Public pool stats: balance, reserved, exposure, guarantees, events (A-9.8).
export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <h1>Pool #{id}</h1>
      <p>Not implemented yet (A-9.8).</p>
    </main>
  );
}
