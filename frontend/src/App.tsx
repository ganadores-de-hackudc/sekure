import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getAuthStatus, clearToken } from './api';
import type { AuthStatus } from './types';
import { ThemeProvider } from './ThemeContext';
import { LanguageProvider, useLanguage } from './i18n';
import Layout from './components/Layout';
import AuthScreen from './components/AuthScreen';

// Lazy-loaded route components — only downloaded when visited
const Generator = lazy(() => import('./components/Generator'));
const Checker = lazy(() => import('./components/Checker'));
const Vault = lazy(() => import('./components/Vault'));
const Groups = lazy(() => import('./components/Groups'));
const SekureKids = lazy(() => import('./components/SekureKids'));
const KidsLayout = lazy(() => import('./components/KidsLayout'));
const KidsVault = lazy(() => import('./components/KidsVault'));
const Profile = lazy(() => import('./components/Profile'));
const ShareReceive = lazy(() => import('./components/ShareReceive'));
const ExtensionDownload = lazy(() => import('./components/ExtensionDownload'));

function RouteFallback() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-sekure-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

function AppContent() {
    const [auth, setAuth] = useState<AuthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

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
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">{t('app.loading')}</p>
                </div>
            </div>
        );
    }

    if (!auth?.authenticated) {
        return <AuthScreen onAuthenticated={refreshAuth} />;
    }

    // Kids account: show colorful kids-only layout
    if (auth.user?.is_kids_account) {
        return (
            <Suspense fallback={<RouteFallback />}>
                <KidsLayout username={auth.user.username} onLogout={handleLogout}>
                    <KidsVault userId={auth.user.id} />
                </KidsLayout>
            </Suspense>
        );
    }

    const handleUsernameChanged = (newUsername: string) => {
        setAuth(prev => prev && prev.user ? { ...prev, user: { ...prev.user, username: newUsername } } : prev);
    };

    // Normal user: standard layout + kids route
    return (
        <Layout username={auth.user?.username ?? ''} onLogout={handleLogout}>
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path="/" element={<Navigate to="/vault" replace />} />
                    <Route path="/vault" element={<Vault />} />
                    <Route path="/generator" element={<Generator />} />
                    <Route path="/checker" element={<Checker />} />
                    <Route path="/groups" element={<Groups currentUserId={auth.user?.id ?? 0} />} />
                    <Route path="/kids" element={<SekureKids />} />
                    <Route path="/extension" element={<ExtensionDownload />} />
                    <Route path="/profile" element={<Profile username={auth.user?.username ?? ''} onLogout={handleLogout} onUsernameChanged={handleUsernameChanged} />} />
                    <Route path="/share/:shareId" element={<ShareReceive />} />
                    <Route path="*" element={<Navigate to="/vault" replace />} />
                </Routes>
            </Suspense>
        </Layout>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <AppContent />
            </LanguageProvider>
        </ThemeProvider>
    );
}
