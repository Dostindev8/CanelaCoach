/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        void: '#000000',
        surface: {
          DEFAULT: '#050B14',
          alt: '#0B1220',
          light: '#F4F7FA',
        },
        border: {
          subtle: '#1B2A41',
          glow: '#176EA4',
        },
        card: {
          'top-glow': '#0A2A4D',
        },
        brand: {
          blue: '#2E9BE6',
          silver: '#9AA5B1',
        },
        accent: {
          DEFAULT: '#2E9BE6',
          bright: '#0C83F4',
          deep: '#01469B',
        },
        link: '#149CDE',
        text: {
          primary: '#F4F3F1',
          placeholder: '#DEDFE3',
          secondary: '#9BA3AF',
        },
        navy: '#0B1220',
        silver: '#9AA5B1',
        success: '#3FA65B',
        warn: '#E0A72E',
        danger: '#D64545',
      },
      fontFamily: {
        display: ['Oswald', 'Barlow Condensed', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'fluid-xl': 'clamp(1.75rem, 4vw, 2.75rem)',
        'fluid-lg': 'clamp(1.25rem, 2.5vw, 1.75rem)',
        'fluid-base': 'clamp(0.95rem, 1.2vw, 1.05rem)',
      },
      borderRadius: {
        auth: '24px',
        field: '12px',
        social: '14px',
      },
      maxWidth: {
        auth: '480px',
        composition: '1600px',
      },
      boxShadow: {
        'auth-card':
          '0 0 0 1px #1B2A41, 0 -20px 40px -10px rgba(10, 42, 77, 0.45), 0 24px 48px rgba(0, 0, 0, 0.55)',
        'btn-primary': '0 8px 24px rgba(12, 131, 244, 0.35)',
        'btn-primary-hover': '0 10px 28px rgba(12, 131, 244, 0.5)',
        'input-glow': '0 0 0 1px #176EA4, 0 0 12px rgba(23, 110, 164, 0.25)',
        'input-focus': '0 0 0 1px #0C83F4, 0 0 18px rgba(12, 131, 244, 0.4)',
      },
      backgroundImage: {
        'btn-primary': 'linear-gradient(90deg, #0C83F4 0%, #01469B 100%)',
        'card-top-glow':
          'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(10, 42, 77, 0.9) 0%, transparent 70%)',
        'dot-grid':
          'radial-gradient(circle, rgba(46, 155, 230, 0.08) 1.5px, transparent 1.5px)',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
      },
      keyframes: {
        'auth-enter': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'check-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'auth-enter': 'auth-enter 400ms ease-out both',
        'check-in': 'check-in 120ms ease-out both',
        spin: 'spin 0.7s linear infinite',
      },
      transitionDuration: {
        micro: '150ms',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
        social: '64px',
      },
    },
  },
  plugins: [],
};
