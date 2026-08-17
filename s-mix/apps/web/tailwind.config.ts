import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta S-MIX: preto/grafite de estúdio + roxo/azul elétrico de mixagem
        smix: {
          bg: '#070B14',        // azul-marinho quase preto (não preto puro)
          bgSoft: '#0D1526',    // segunda camada, para gradientes
          surface: '#131C30',
          border: '#243248',
          primary: '#6D5EF5',   // roxo-azulado elétrico
          accent: '#38BDF8',    // azul claro vibrante (destaque pedido)
          text: '#F1F5FB',
          muted: '#8C9BB8',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
