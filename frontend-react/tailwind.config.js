/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#7c3aed',
                'primary-dark': '#6d28d9',
                secondary: '#06b6d4',
                accent: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                dark: {
                    DEFAULT: '#0a0a0f',
                    100: '#12121a',
                    200: '#1a1a2e',
                    300: '#20203a',
                    400: '#2a2a4a',
                },
                'text-primary': '#f1f5f9',
                'text-secondary': '#94a3b8',
                'text-muted': '#64748b',
            },
            fontFamily: {
                sans: ['Space Grotesk', 'sans-serif'],
                display: ['Orbitron', 'sans-serif'],
                heading: ['Bebas Neue', 'sans-serif'],
                body: ['Rajdhani', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'twinkle': 'twinkle var(--t, 2s) ease-in-out infinite',
                'meteor': 'meteor 3s linear infinite',
                'spin-slow': 'spin 12s linear infinite',
                'spin-reverse': 'spinReverse 10s linear infinite',
                'orbit': 'orbit 20s linear infinite',
                'particle-float': 'particleFloat var(--dur, 3s) ease-in-out infinite',
                'hero-float': 'heroFloat 8s ease-in-out infinite',
                'scan-line': 'scanLine 4s linear infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(124,58,237,0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(124,58,237,0.6)' },
                },
                twinkle: {
                    '0%, 100%': { opacity: 'var(--op, 0.3)' },
                    '50%': { opacity: '1' },
                },
                meteor: {
                    '0%': { transform: 'translateY(-100vh) translateX(0)', opacity: '1' },
                    '100%': { transform: 'translateY(100vh) translateX(-200px)', opacity: '0' },
                },
                spinReverse: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(-360deg)' },
                },
                orbit: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                particleFloat: {
                    '0%, 100%': { transform: 'translate(0, 0)', opacity: '0.5' },
                    '50%': { transform: 'translate(var(--float-x, 20px), var(--float-y, -20px))', opacity: '1' },
                },
                heroFloat: {
                    '0%, 100%': { transform: 'translateY(0) rotate(0)' },
                    '50%': { transform: 'translateY(-30px) rotate(5deg)' },
                },
                scanLine: {
                    '0%': { top: '-10%' },
                    '100%': { top: '110%' },
                },
            },
        },
    },
    plugins: [],
}
