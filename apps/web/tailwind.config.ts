import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta S-MIX: preto/grafite de estúdio + roxo/azul elétrico de mixagem
        smix: {
          bg: '#0B0B10',
          surface: '#15151D',
          border: '#25252F',
          primary: '#7C3AED', // roxo elétrico
          accent: '#22D3EE',  // ciano de "sinal de áudio"
          text: '#F5F5F7',
          muted: '#9494A6',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
