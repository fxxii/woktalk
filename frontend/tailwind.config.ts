/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // WokTalk Brand Colors
        wok: {
          flame: '#FF6B35',      // Wok Hei flame orange
          coal: '#1A1A2E',       // Deep coal black
          steam: '#F5F5F5',      // Light steam white
          ginger: '#FFB347',     // Warm ginger yellow
          soy: '#4A3728',        // Soy sauce brown
          jade: '#00A86B',       // Jade green for success
          chili: '#DC143C',      // Chili red for warnings
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        chinese: ['Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', 'sans-serif'],
      },
      fontSize: {
        // Grease-Mode: 50% larger than standard
        'grease-sm': ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
        'grease-base': ['1.5rem', { lineHeight: '2.25rem' }],    // 24px
        'grease-lg': ['1.875rem', { lineHeight: '2.625rem' }],   // 30px
        'grease-xl': ['2.25rem', { lineHeight: '3rem' }],        // 36px
        'grease-2xl': ['3rem', { lineHeight: '3.75rem' }],       // 48px
        'grease-3xl': ['3.75rem', { lineHeight: '4.5rem' }],     // 60px
      },
      spacing: {
        // Grease-Mode: Large tap targets (>60px)
        'tap': '60px',
        'tap-lg': '80px',
        'tap-xl': '100px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flame': 'flame 0.5s ease-in-out infinite alternate',
        'steam': 'steam 2s ease-in-out infinite',
      },
      keyframes: {
        flame: {
          '0%': { transform: 'scale(1) rotate(-2deg)', opacity: '0.9' },
          '100%': { transform: 'scale(1.1) rotate(2deg)', opacity: '1' },
        },
        steam: {
          '0%, 100%': { opacity: '0.3', transform: 'translateY(0)' },
          '50%': { opacity: '0.7', transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
