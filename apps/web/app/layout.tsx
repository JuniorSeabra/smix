import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'S-MIX',
  description: 'MultiTracks gospel para músicos e equipes de louvor',
  manifest: '/manifest.json',
};

// Sem isto o iOS/Safari trata a página como desktop e, ao focar um campo de
// busca, amplia a tela e não desfaz o zoom depois. `maximumScale` fica em 5
// de propósito: trava o zoom automático indesejado sem impedir o usuário de
// dar pinça pra ampliar quando quiser.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
