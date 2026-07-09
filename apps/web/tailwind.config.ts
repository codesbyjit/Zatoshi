import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"Cascadia Code"',
          'monospace',
        ],
      },
      colors: {
        bg: {
          DEFAULT: '#ffffff',
          secondary: '#f5f5f5',
          tertiary: '#ebebeb',
        },
        text: {
          primary: '#000000',
          secondary: '#1a1a1a',
          muted: '#737373',
          inverse: '#ffffff',
        },
        brand: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          active: '#1e40af',
          light: '#eff6ff',
        },
        border: {
          DEFAULT: '#e5e5e5',
          hover: '#a3a3a3',
          strong: '#171717',
        },
        success: {
          DEFAULT: '#16a34a',
          bg: '#f0fdf4',
        },
        error: {
          DEFAULT: '#dc2626',
          bg: '#fef2f2',
        },
        warning: {
          DEFAULT: '#ca8a04',
          bg: '#fefce8',
        },
        info: {
          DEFAULT: '#2563eb',
          bg: '#eff6ff',
        },
        accent: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          active: '#1e40af',
          light: '#eff6ff',
        },
      },
      fontSize: {
        h1: ['32px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        h2: ['24px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.015em' }],
        h3: ['20px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        h4: ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-medium': ['16px', { lineHeight: '1.5', fontWeight: '500' }],
        sm: ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        'sm-medium': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.025em' }],
        xs: ['11px', { lineHeight: '1.2', fontWeight: '500', letterSpacing: '0.03em' }],
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.04)',
        sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)',
        lg: '0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)',
        xl: '0 20px 25px rgba(0,0,0,0.08), 0 8px 10px rgba(0,0,0,0.04)',
        'product-hover': '0 12px 24px rgba(0,0,0,0.08)',
      },
      transitionDuration: {
        '75': '75ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      zIndex: {
        base: '0',
        sticky: '100',
        dropdown: '200',
        sidebar: '300',
        nav: '400',
        drawer: '500',
        modal: '600',
        toast: '700',
        tooltip: '800',
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
