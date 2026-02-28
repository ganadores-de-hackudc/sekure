import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getAuthStatus, clearToken } from './api';
import type { AuthStatus } from './types';
import { ThemeProvider } from './ThemeContext';
import Layout from './components/Layout';
import AuthScreen from './components/AuthScreen';
import Generator from './components/Generator';
import Checker from './components/Checker';
import Vault from './components/Vault';

export default function App() {
    const [auth, setAuth] = useState<AuthStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshAuth = async () => {
        try {
            const status = await getAuthStatus();
            setAuth(status);
        } catch {
            setAuth({ authenticated: false });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        clearToken();
        setAuth({ authenticated: false });
    };

    useEffect(() => {
        refreshAuth();
    }, []);

    if (loading) {
        return (
            <ThemeProvider>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 dark:text-gray-400">Cargando Sekure...</p>
                    </div>
                </div>
            </ThemeProvider>
        );
    }

    if (!auth?.authenticated) {
        return (
            <ThemeProvider>
                <AuthScreen onAuthenticated={refreshAuth} />
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <Layout username={auth.user?.username ?? ''} onLogout={handleLogout}>
                <Routes>
                    <Route path="/" element={<Navigate to="/generator" replace />} />
                    <Route path="/generator" element={<Generator />} />
                    <Route path="/checker" element={<Checker />} />
                    <Route path="/vault" element={<Vault />} />
                    <Route path="*" element={<Navigate to="/generator" replace />} />
                </Routes>
            </Layout>
        </ThemeProvider>
    );
}
