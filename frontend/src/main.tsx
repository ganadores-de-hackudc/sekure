import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

const toastOptions = {
    className: 'toast-themed',
    style: {
        background: 'var(--toast-bg, #ffffff)',
        color: 'var(--toast-text, #1f2937)',
        border: '1px solid var(--toast-border, #e5e7eb)',
        borderRadius: '8px',
    },
    success: {
        iconTheme: {
            primary: '#9b1b2f',
            secondary: '#ffffff',
        },
    },
    error: {
        iconTheme: {
            primary: '#ef4444',
            secondary: '#ffffff',
        },
    },
} as const;

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
            <Toaster position="bottom-right" toastOptions={toastOptions} />
        </BrowserRouter>
    </React.StrictMode>,
)
