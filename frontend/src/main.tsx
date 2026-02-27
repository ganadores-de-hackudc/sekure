import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#1f2937',
                        color: '#f3f4f6',
                        border: '1px solid #374151',
                        borderRadius: '12px',
                    },
                    success: {
                        iconTheme: {
                            primary: '#9b1b2f',
                            secondary: '#f3f4f6',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#f3f4f6',
                        },
                    },
                }}
            />
        </BrowserRouter>
    </React.StrictMode>,
)
