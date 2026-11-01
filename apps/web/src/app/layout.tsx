import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { appConfig } from '@/app.config';
import './globals.css';

export const metadata: Metadata = {
  title: { default: appConfig.name, template: `%s · ${appConfig.name}` },
  description: appConfig.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-dark-background text-dark-text antialiased">
        {children}
        <footer className="mx-auto max-w-3xl px-6 py-8 text-sm text-dark-textMuted">
          {appConfig.disclaimer}
        </footer>
      </body>
    </html>
  );
}
