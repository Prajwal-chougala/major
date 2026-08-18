/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surface hierarchy (dark mode depth layers)
        'surface': '#0B1326',
        'surface-dim': '#0e1417',
        'surface-bright': '#333a3d',
        'surface-container-lowest': '#090f12',
        'surface-container-low': '#161d1f',
        'surface-container': '#1a2123',
        'surface-container-high': '#242b2e',
        'surface-container-highest': '#2f3639',

        // On-surface text
        'on-surface': '#DAE2FD',
        'on-surface-variant': '#bbc9cf',
        'on-background': '#dde3e7',

        // Accent colors
        'sky-blue': '#87CEEB',
        'deep-sky-blue': '#00BFFF',
        'electric-blue': '#0EA5E9',
        'vibrant-violet': '#35259B',
        'brand-indigo': '#35259B',
        'brand-blue': '#2143B8',
        'brand-sky': '#0EA5E9',

        // Primary
        'primary': '#a4e6ff',
        'primary-container': '#00D1FF',
        'on-primary': '#003543',
        'on-primary-container': '#00566a',

        // Secondary (violet spectrum)
        'secondary': '#d0bcff',
        'secondary-container': '#571bc1',
        'on-secondary': '#3c0091',
        'on-secondary-container': '#c4abff',

        // Tertiary (amber/gold)
        'tertiary': '#ffd59c',
        'tertiary-container': '#feb127',
        'on-tertiary': '#442b00',

        // Error
        'error': '#ffb4ab',
        'error-red': '#FFB4AB',
        'error-container': '#93000a',
        'on-error': '#690005',
        'on-error-container': '#ffdad6',

        // Outline
        'outline': '#859399',
        'outline-variant': '#3c494e',

        // Utility
        'glass-stroke': 'rgba(255, 255, 255, 0.1)',
        'inverse-surface': '#dde3e7',
        'inverse-on-surface': '#2b3134',
        'inverse-primary': '#00677f',

        // Legacy compat
        'dark': '#0B1326',
        'card': '#111827',
        'border': '#1e293b',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'title-md': ['20px', { lineHeight: '28px', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'data-mono': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '500' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.1em', fontWeight: '700' }],
      },
      spacing: {
        'section-gap': '48px',
        'card-padding': '24px',
        'gutter': '16px',
        'container-margin': '24px',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}