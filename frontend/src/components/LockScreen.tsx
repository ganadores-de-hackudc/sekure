import { useState } from 'react';
import { setupMaster, unlockVault } from '../api';
import { useTheme } from '../ThemeContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, Moon, Sun } from 'lucide-react';

interface LockScreenProps {
    isSetup: boolean;
    onUnlocked: () => void;
}

export default function LockScreen({ isSetup, onUnlocked }: LockScreenProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        if (!isSetup && password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        if (!isSetup && password.length < 8) {
            toast.error('La contraseña maestra debe tener al menos 8 caracteres');
            return;
        }

        setLoading(true);
        try {
            if (isSetup) {
                await unlockVault(password);
                toast.success('Bóveda desbloqueada');
            } else {
                await setupMaster(password);
                toast.success('Contraseña maestra configurada');
            }
            onUnlocked();
        } catch (err: any) {
            toast.error(err.message || 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-beige-100 dark:bg-gray-950 relative">
            {/* Theme toggle - top right */}
            <button
                onClick={toggleTheme}
                className="fixed top-4 right-4 z-50 theme-toggle-btn"
                title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sekure-200/30 dark:bg-sekure-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-beige-300/40 dark:bg-sekure-500/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-slide-up">
                <div className="card text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <img src="/sekure-longlogo.svg" alt="Sekure" className="h-25" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        {isSetup
                            ? 'Introduce tu contraseña maestra para desbloquear'
                            : 'Crea una contraseña maestra para proteger tu bóveda'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña maestra"
                                className="input-field pr-12"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {!isSetup && (
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirmar contraseña maestra"
                                className="input-field"
                            />
                        )}

                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isSetup ? 'Desbloquear' : 'Crear contraseña maestra'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {!isSetup && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                            Esta contraseña cifra todas tus credenciales almacenadas.
                            <br />No se puede recuperar si la olvidas.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
