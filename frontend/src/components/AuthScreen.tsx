import { useState } from 'react';
import { register, login } from '../api';
import { useTheme } from '../ThemeContext';
import { useLanguage, LANGUAGES } from '../i18n';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, UserPlus, LogIn, Moon, Sun, Globe, ChevronDown } from 'lucide-react';
import { useRef, useEffect } from 'react';

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
    const [langOpen, setLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);
    const { theme, toggleTheme } = useTheme();
    const { lang, setLang, t } = useLanguage();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLang = LANGUAGES.find(l => l.code === lang)!;

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
                toast.error(t('auth.passwords_mismatch'));
                return;
            }
            if (password.length < 8) {
                toast.error(t('auth.password_min_length'));
                return;
            }
            if (username.trim().length < 3) {
                toast.error(t('auth.username_min_length'));
                return;
            }
        }

        setLoading(true);
        try {
            if (mode === 'login') {
                await login(username.trim(), password);
                toast.success(t('auth.login_success'));
            } else {
                await register(username.trim(), password);
                toast.success(t('auth.register_success'));
            }
            onAuthenticated();
        } catch (err: any) {
            toast.error(err.message || 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-beige-100 dark:bg-gray-950 relative">
            {/* Top right controls */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
                {/* Language selector */}
                <div className="relative" ref={langRef}>
                    <button
                        onClick={() => setLangOpen(!langOpen)}
                        className="theme-toggle-btn flex items-center gap-1.5 text-sm"
                    >
                        <img src={currentLang.flag} alt={currentLang.label} className="w-5 h-4 rounded-sm object-cover" />
                        <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {langOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[140px] z-50 animate-fade-in">
                            {LANGUAGES.map((l) => (
                                <button
                                    key={l.code}
                                    onClick={() => {
                                        setLang(l.code);
                                        setLangOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${lang === l.code
                                        ? 'bg-sekure-50 text-sekure-700 dark:bg-sekure-600/15 dark:text-sekure-400'
                                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <img src={l.flag} alt={l.label} className="w-5 h-4 rounded-sm object-cover" />
                                    <span>{l.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className="theme-toggle-btn"
                    title={theme === 'light' ? t('nav.dark_mode') : t('nav.light_mode')}
                >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
            </div>

            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sekure-200/30 dark:bg-sekure-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-beige-300/40 dark:bg-sekure-500/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-slide-up">
                <div className="card text-center">
                    <div className="flex justify-center mb-6">
                        <img src="/sekure-longlogo.svg" alt="Sekure" className="h-20" />
                    </div>

                    <div className="flex rounded-md bg-gray-100 dark:bg-gray-800/50 p-1 mb-8">
                        <button
                            onClick={() => switchMode('login')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium transition-all ${mode === 'login'
                                ? 'bg-sekure-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <LogIn className="w-4 h-4" />
                            {t('auth.login')}
                        </button>
                        <button
                            onClick={() => switchMode('register')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium transition-all ${mode === 'register'
                                ? 'bg-sekure-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <UserPlus className="w-4 h-4" />
                            {t('auth.register')}
                        </button>
                    </div>

                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {mode === 'login' ? t('auth.login_desc') : t('auth.register_desc')}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t('auth.username')}
                            className="input-field"
                            autoFocus
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('auth.master_password')}
                                className="input-field pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>

                        {mode === 'register' && (
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('auth.confirm_password')}
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
                                    {mode === 'login' ? t('auth.login') : t('auth.create_account')}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {mode === 'register' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                            {t('auth.master_warning')}
                            <br />{t('auth.master_warning2')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
