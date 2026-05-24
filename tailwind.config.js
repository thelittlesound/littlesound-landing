/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Teal
        teal: {
          900: '#0A4A5A',
          800: '#0D5C6E',
          700: '#1A7A8A',
          600: '#2A9AAA',
          100: '#D6EEF2',
        },
        // Blue Grey
        'blue-grey': {
          300: '#C5D8E8',
          100: '#EBF2F8',
        },
        // Cream
        cream: {
          500: '#F5EFE0',
          300: '#FAF6EE',
          700: '#E8DFC8',
        },
        // Text
        'text': {
          dark: '#1C3A4A',
          mid: '#3A5A6A',
          light: '#FFFFFF',
          muted: '#7A9AAA',
        },
        // Accents
        gold: {
          DEFAULT: '#C4A882',
          dark: '#A8865A',
        },
        // Semantic
        success: '#3A9E7A',
        warning: '#D4A53A',
        error: '#C0544A',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['DM Sans', 'Helvetica Neue', 'sans-serif'],
        ui: ['DM Sans', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        md: '1.125rem',
        lg: '1.25rem',
        xl: '1.5rem',
        '2xl': '1.875rem',
        '3xl': '2.25rem',
        '4xl': '3rem',
        '5xl': '3.75rem',
        '6xl': '4.5rem',
      },
      fontWeight: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.15,
        snug: 1.3,
        normal: 1.5,
        relaxed: 1.7,
      },
      letterSpacing: {
        tight: '-0.02em',
        normal: '0em',
        wide: '0.05em',
        wider: '0.1em',
        widest: '0.15em',
      },
      spacing: {
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
        32: '8rem',
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
        xl: '28px',
        pill: '9999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(10, 74, 90, 0.08), 0 1px 2px rgba(10, 74, 90, 0.06)',
        md: '0 4px 12px rgba(10, 74, 90, 0.10), 0 2px 6px rgba(10, 74, 90, 0.08)',
        lg: '0 12px 32px rgba(10, 74, 90, 0.14), 0 4px 12px rgba(10, 74, 90, 0.10)',
        xl: '0 24px 56px rgba(10, 74, 90, 0.18), 0 8px 20px rgba(10, 74, 90, 0.12)',
        card: '0 2px 16px rgba(10, 74, 90, 0.09)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '250ms',
        slow: '400ms',
      },
      maxWidth: {
        content: '1280px',
        text: '720px',
        narrow: '480px',
      },
    },
  },
  plugins: [],
}
