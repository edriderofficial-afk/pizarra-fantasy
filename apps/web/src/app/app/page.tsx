import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Web app' };

export default function WebAppPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-bold">Web app</h1>
      <p className="mt-2 text-dark-textMuted">Paridad con la app móvil: en construcción.</p>
    </main>
  );
}
