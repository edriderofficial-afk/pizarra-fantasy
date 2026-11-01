import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Estadísticas' };

export default function StatsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold">Estadísticas</h1>
      <p className="mt-2 text-dark-textMuted">
        Tabla pública de jugadores: disponible en la Fase 3.
      </p>
    </main>
  );
}
