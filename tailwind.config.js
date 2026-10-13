/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="Dusa"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-in-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '60%': { transform: 'translateY(15px)', opacity: '1' },
          '80%': { transform: 'translateY(-8px)' },
          '100%': { transform: 'translateY(0)' }
        },
        'slide-out-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '20%': { transform: 'translateY(10px)' },
          '100%': { transform: 'translateY(-100%)', opacity: '0' }
        }
      },
      animation: {
        'slide-in-down':
          'slide-in-down 0.6s cubic-bezier(0.22, 1.0, 0.36, 1.0) forwards',
        'slide-out-up': 'slide-out-up  0.5s ease-in forwards'
      }
    }
  },
  plugins: []
};
