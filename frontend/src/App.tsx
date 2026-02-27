import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getAuthStatus } from './api';
import type { AuthStatus } from './types';
import Layout from './components/Layout';
import LockScreen from './components/LockScreen';
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
            setAuth({ is_setup: false, is_unlocked: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshAuth();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400">Cargando Sekure...</p>
                </div>
            </div>
        );
    }

    if (!auth?.is_unlocked) {
        return (
            <LockScreen
                isSetup={auth?.is_setup ?? false}
                onUnlocked={refreshAuth}
            />
        );
    }

    return (
        <Layout onLock={refreshAuth}>
            <Routes>
                <Route path="/" element={<Navigate to="/generator" replace />} />
                <Route path="/generator" element={<Generator />} />
                <Route path="/checker" element={<Checker />} />
                <Route path="/vault" element={<Vault />} />
                <Route path="*" element={<Navigate to="/generator" replace />} />
            </Routes>
        </Layout>
    );
}
