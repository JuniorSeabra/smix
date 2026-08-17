'use client';

import { Header } from '../../components/Header';
import { BottomNav } from '../../components/BottomNav';

export default function MixingPage() {
  return (
    <main className="min-h-screen pb-24 md:pb-8">
      <Header />
      <BottomNav />

      <div className="px-5 mt-16 flex flex-col items-center gap-4 max-w-sm mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-smix-surface border border-smix-border flex items-center justify-center text-2xl">
          🎚
        </div>
        <h1 className="text-xl font-bold">Mixagem em breve</h1>
        <p className="text-smix-muted text-sm">
          Aqui você vai poder controlar canais, faders e retornos da mesa de som
          diretamente pelo S-MIX, quando o dispositivo de mixagem estiver disponível
          na mesma rede local. Essa funcionalidade está planejada para uma fase
          posterior do projeto.
        </p>
      </div>
    </main>
  );
}
