/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jeepney: '#C62828',
        mango: '#F4B400',
        malunggay: '#2E7D32',
        dirty: '#F5F1E8',
        concrete: '#D9D9D9',
        jet: '#111111',
        asphalt: '#666666',
        traffic: '#FF5722',
        background: '#F5F1E8',
        card: '#D9D9D9',
        primaryText: '#111111',
        secondaryText: '#666666',
        accent: '#C62828',
        success: '#2E7D32',
        warning: '#F4B400',
        danger: '#FF5722',
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Impact', 'sans-serif'],
        poster: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        hard: '3px 3px 0 0 #111111',
        hardSm: '2px 2px 0 0 #111111',
        hardLg: '4px 4px 0 0 #111111',
      },
      borderWidth: {
        3: '2px',
      },
    },
  },
  plugins: [],
}
