import { useState } from 'react';
import { setupMaster, unlockVault } from '../api';
import toast from 'react-hot-toast';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface LockScreenProps {
    isSetup: boolean;
    onUnlocked: () => void;
}

export default function LockScreen({ isSetup, onUnlocked }: LockScreenProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

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
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sekure-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sekure-500/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-slide-up">
                <div className="card text-center">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-sekure-500 to-sekure-700 rounded-2xl flex items-center justify-center shadow-lg shadow-sekure-500/30">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold mb-2">Sekure</h1>
                    <p className="text-gray-400 mb-8">
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
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
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
                        <p className="text-xs text-gray-500 mt-4">
                            Esta contraseña cifra todas tus credenciales almacenadas.
                            <br />No se puede recuperar si la olvidas.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
