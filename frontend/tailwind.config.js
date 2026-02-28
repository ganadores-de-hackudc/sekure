/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                sekure: {
                    50: '#fdf2f4',
                    100: '#fce4e8',
                    200: '#facdd4',
                    300: '#f4a3b0',
                    400: '#e86f82',
                    500: '#d43d55',
                    600: '#9b1b2f',
                    700: '#7a1425',
                    800: '#530e17',
                    900: '#3d0a11',
                    950: '#24060a',
                },
                beige: {
                    50: '#faf8f5',
                    100: '#f5f0ea',
                    150: '#efe8df',
                    200: '#e8dfd3',
                    300: '#d5c9b8',
                    400: '#b8a996',
                },
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
