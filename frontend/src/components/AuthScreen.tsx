import { useState } from 'react';
import { register, login } from '../api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, UserPlus, LogIn } from 'lucide-react';

type AuthMode = 'login' | 'register';

interface AuthScreenProps {
    onAuthenticated: () => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
    const [mode, setMode] = useState<AuthMode>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const switchMode = (m: AuthMode) => {
        setMode(m);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password) return;

        if (mode === 'register') {
            if (password !== confirmPassword) {
                toast.error('Las contraseñas no coinciden');
                return;
            }
            if (password.length < 8) {
                toast.error('La contraseña debe tener al menos 8 caracteres');
                return;
            }
            if (username.trim().length < 3) {
                toast.error('El nombre de usuario debe tener al menos 3 caracteres');
                return;
            }
        }

        setLoading(true);
        try {
            if (mode === 'login') {
                await login(username.trim(), password);
                toast.success('Sesión iniciada');
            } else {
                await register(username.trim(), password);
                toast.success('Cuenta creada correctamente');
            }
            onAuthenticated();
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
                        <img src="/sekure-longlogo.svg" alt="Sekure" className="h-20" />
                    </div>

                    {/* Tabs */}
                    <div className="flex rounded-xl bg-gray-800/50 p-1 mb-8">
                        <button
                            onClick={() => switchMode('login')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'login'
                                ? 'bg-sekure-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <LogIn className="w-4 h-4" />
                            Iniciar sesión
                        </button>
                        <button
                            onClick={() => switchMode('register')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'register'
                                ? 'bg-sekure-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <UserPlus className="w-4 h-4" />
                            Registrarse
                        </button>
                    </div>

                    <p className="text-gray-400 mb-6">
                        {mode === 'login'
                            ? 'Introduce tus credenciales para acceder a tu bóveda'
                            : 'Crea una cuenta para proteger tus contraseñas'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Nombre de usuario"
                            className="input-field"
                            autoFocus
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña maestra"
                                className="input-field pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {mode === 'register' && (
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirmar contraseña"
                                className="input-field"
                            />
                        )}

                        <button
                            type="submit"
                            disabled={loading || !username.trim() || !password}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {mode === 'register' && (
                        <p className="text-xs text-gray-500 mt-4">
                            Tu contraseña maestra cifra todas tus credenciales.
                            <br />No se puede recuperar si la olvidas.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
