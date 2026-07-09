import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: 'var(--sidebar-bg)',
          hover: 'var(--sidebar-bg-hover)',
          active: 'var(--sidebar-bg-active)',
          muted: 'var(--sidebar-text-muted)',
        },
        admin: {
          accent: 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          'accent-light': 'var(--color-accent-light)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
      transitionProperty: {
        'theme': 'background-color, color, border-color, box-shadow',
      },
    },
  },
  plugins: [],
};

export default config;
