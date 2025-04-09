// craco.config.js
module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  typescript: {
    enableTypeChecking: true, // Включаем проверку типов TypeScript
  },
  webpack: {
    alias: {
      '@': require('path').resolve(__dirname, 'src'),
    },
  },
  jest: {
    configure: {
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
    },
  },
};