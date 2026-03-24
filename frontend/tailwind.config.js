/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                fontFamily: {
                        'heading': ['Playfair Display', 'serif'],
                        'body': ['DM Sans', 'sans-serif'],
                },
                borderRadius: {
                        lg: '0px',
                        md: '0px',
                        sm: '0px',
                        none: '0px'
                },
                colors: {
                        background: '#F9F9F7',
                        foreground: '#000000',
                        'bone-white': '#F9F9F7',
                        'ashanti-gold': '#D4AF37',
                        'midnight': '#000000',
                        'ghana-red': '#CE1126',
                        'ghana-green': '#006B3F',
                        'surface': '#FFFFFF',
                        'border-light': '#E5E5E5',
                        'muted-text': '#888888',
                        card: {
                                DEFAULT: '#FFFFFF',
                                foreground: '#000000'
                        },
                        popover: {
                                DEFAULT: '#FFFFFF',
                                foreground: '#000000'
                        },
                        primary: {
                                DEFAULT: '#000000',
                                foreground: '#FFFFFF'
                        },
                        secondary: {
                                DEFAULT: '#D4AF37',
                                foreground: '#000000'
                        },
                        muted: {
                                DEFAULT: '#F9F9F7',
                                foreground: '#888888'
                        },
                        accent: {
                                DEFAULT: '#D4AF37',
                                foreground: '#000000'
                        },
                        destructive: {
                                DEFAULT: '#CE1126',
                                foreground: '#FFFFFF'
                        },
                        border: '#E5E5E5',
                        input: '#E5E5E5',
                        ring: '#000000',
                        chart: {
                                '1': '#D4AF37',
                                '2': '#CE1126',
                                '3': '#006B3F',
                                '4': '#000000',
                                '5': '#888888'
                        }
                },
                keyframes: {
                        'accordion-down': {
                                from: { height: '0' },
                                to: { height: 'var(--radix-accordion-content-height)' }
                        },
                        'accordion-up': {
                                from: { height: 'var(--radix-accordion-content-height)' },
                                to: { height: '0' }
                        },
                        'marquee': {
                                '0%': { transform: 'translateX(0%)' },
                                '100%': { transform: 'translateX(-50%)' }
                        },
                        'fade-up': {
                                '0%': { opacity: '0', transform: 'translateY(20px)' },
                                '100%': { opacity: '1', transform: 'translateY(0)' }
                        },
                        'fade-in': {
                                '0%': { opacity: '0' },
                                '100%': { opacity: '1' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'marquee': 'marquee 30s linear infinite',
                        'fade-up': 'fade-up 0.6s ease-out forwards',
                        'fade-in': 'fade-in 0.4s ease-out forwards'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
