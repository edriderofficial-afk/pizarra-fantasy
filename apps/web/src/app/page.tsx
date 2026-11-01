import Link from 'next/link';
import { MODEL_VERSION } from '@pizarra/core';
import { appConfig } from '@/app.config';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold">{appConfig.name}</h1>
      <p className="text-lg text-dark-textMuted">{appConfig.tagline}</p>
      <nav className="flex gap-4">
        <Link className="rounded-md bg-dark-primary px-4 py-2 text-dark-onPrimary" href="/stats">
          Estadísticas
        </Link>
        <Link className="rounded-md border border-dark-border px-4 py-2" href="/app">
          Web app
        </Link>
      </nav>
      <p className="text-xs text-dark-textMuted">Modelo v{MODEL_VERSION}</p>
    </main>
  );
}
