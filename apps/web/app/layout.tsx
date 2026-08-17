import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'S-MIX',
  description: 'MultiTracks gospel para músicos e equipes de louvor',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
