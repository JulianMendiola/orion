/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        bg:      '#07080d',
        surface: '#0d0e16',
        s2:      '#12131e',
        s3:      '#181928',
        border:  '#1c1d2e',
        border2: '#252638',
        buy:     '#00e5a0',
        sell:    '#ff4d6d',
        hold:    '#f5a623',
        up:      '#00e5a0',
        down:    '#ff4d6d',
        muted:   '#52536b',
        muted2:  '#7b7c96',
        txt:     '#e2e3f0',
        meta:    '#4f8cff',
        lly:     '#c084fc',
        btc:     '#f7931a',
        accent:  '#00e5a0',
      },
      borderRadius: {
        xl2: '18px',
        xl3: '24px',
      },
      animation: {
        'fade-up':   'fadeUp .4s ease both',
        'fade-in':   'fadeIn .3s ease both',
        'shimmer':   'shimmer 1.4s infinite',
        'pulse-dot': 'pulseDot 1.2s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeUp:    { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        shimmer:   { to: { backgroundPosition: '-200% 0' } },
        pulseDot:  { '0%,80%,100%': { opacity: .2, transform: 'scale(.8)' }, '40%': { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
