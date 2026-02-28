import { useState } from 'react';
import { recoverAccount } from '../api';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import { KeyRound, ArrowLeft, ArrowRight, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface RecoverAccountScreenProps {
    onRecovered: (recoveryCode: string, username: string) => void;
    onBack: () => void;
}

export default function RecoverAccountScreen({ onRecovered, onBack }: RecoverAccountScreenProps) {
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !recoveryCode.trim() || !newPassword) return;

        if (newPassword !== confirmPassword) {
            toast.error(t('auth.passwords_mismatch'));
            return;
        }
        if (newPassword.length < 8) {
            toast.error(t('auth.password_min_length'));
            return;
        }

        setLoading(true);
        try {
            const res = await recoverAccount(username.trim(), recoveryCode.trim(), newPassword);
            toast.success(t('recovery.reset_success'));
            onRecovered(res.recovery_code ?? '', username.trim());
        } catch (err: any) {
            toast.error(err.message || 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-beige-100 dark:bg-gray-950 relative">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sekure-200/30 dark:bg-sekure-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-beige-300/40 dark:bg-sekure-500/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative animate-slide-up">
                <div className="card">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('recovery.back_to_login')}
                    </button>

                    <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 rounded-full bg-sekure-100 dark:bg-sekure-900/30 flex items-center justify-center">
                            <KeyRound className="w-7 h-7 text-sekure-600 dark:text-sekure-400" />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-2">
                        {t('recovery.recover_title')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                        {t('recovery.recover_desc')}
                    </p>

                    {/* Data loss warning */}
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 dark:text-red-300 text-xs">
                            {t('recovery.data_loss_warning')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={t('auth.username')}
                            className="input-field"
                            autoFocus
                        />

                        <input
                            type="text"
                            value={recoveryCode}
                            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                            placeholder={t('recovery.code_placeholder')}
                            className="input-field font-mono tracking-wider"
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('recovery.new_password')}
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

                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('auth.confirm_password')}
                            className="input-field"
                        />

                        <button
                            type="submit"
                            disabled={loading || !username.trim() || !recoveryCode.trim() || !newPassword}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {t('recovery.reset_password')}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
