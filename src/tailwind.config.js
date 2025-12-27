module.exports = {
  content: ["./*.html", "./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        primary: '#4361ee',
        'primary-dark': '#3a56d4',
        secondary: '#7209b7',
        success: '#06d6a0',
        danger: '#ef476f',
        warning: '#ffd166',
        dark: '#0f172a',
        light: '#f8fafc',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #4361ee 0%, #7209b7 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(30, 41, 59, 0.7) 100%)',
      },
      animation: {
        'modal-enter': 'modalEnter 0.3s ease-out',
      },
      keyframes: {
        modalEnter: {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
