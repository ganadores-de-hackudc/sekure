import { useState } from 'react';
import { useLanguage } from '../i18n';
import { useTheme } from '../ThemeContext';
import toast from 'react-hot-toast';
import { ShieldCheck, Copy, Download, ArrowRight, CheckCircle2 } from 'lucide-react';

interface RecoveryCodeScreenProps {
    recoveryCode: string;
    username: string;
    onContinue: () => void;
}

export default function RecoveryCodeScreen({ recoveryCode, username, onContinue }: RecoveryCodeScreenProps) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [saved, setSaved] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(recoveryCode);
            toast.success(t('recovery.copied'));
            setSaved(true);
        } catch {
            // fallback
            const textarea = document.createElement('textarea');
            textarea.value = recoveryCode;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            toast.success(t('recovery.copied'));
            setSaved(true);
        }
    };

    const handleDownload = () => {
        const content = [
            '═══════════════════════════════════════',
            '       SEKURE — RECOVERY CODE',
            '═══════════════════════════════════════',
            '',
            `  User:           ${username}`,
            `  Recovery Code:  ${recoveryCode}`,
            '',
            '───────────────────────────────────────',
            '',
            '  Keep this file in a safe place.',
            '  This code allows you to reset your',
            '  master password if you forget it.',
            '',
            '  WARNING: If you use this code, your',
            '  stored passwords will be deleted',
            '  (they cannot be decrypted with a',
            '  new master password).',
            '',
            '═══════════════════════════════════════',
        ].join('\n');

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sekure-recovery-${username}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('recovery.downloaded'));
        setSaved(true);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-beige-100 dark:bg-gray-950 relative">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sekure-200/30 dark:bg-sekure-600/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-beige-300/40 dark:bg-sekure-500/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-lg relative animate-slide-up">
                <div className="card text-center">
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-sekure-100 dark:bg-sekure-900/30 flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-sekure-600 dark:text-sekure-400" />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        {t('recovery.title')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                        {t('recovery.subtitle')}
                    </p>

                    {/* Recovery code */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 mb-4">
                        <p className="font-mono text-2xl tracking-widest text-gray-800 dark:text-white font-bold select-all">
                            {recoveryCode}
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={handleCopy}
                            className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            {t('recovery.copy')}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="btn-secondary flex-1 flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {t('recovery.download')}
                        </button>
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 text-left">
                        <p className="text-amber-800 dark:text-amber-300 text-sm font-medium mb-1">
                            {t('recovery.warning_title')}
                        </p>
                        <ul className="text-amber-700 dark:text-amber-400 text-xs space-y-1">
                            <li>• {t('recovery.warning1')}</li>
                            <li>• {t('recovery.warning2')}</li>
                            <li>• {t('recovery.warning3')}</li>
                        </ul>
                    </div>

                    {/* Continue button */}
                    <button
                        onClick={onContinue}
                        disabled={!saved}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${saved
                                ? 'btn-primary'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {saved ? (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                {t('recovery.continue')}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        ) : (
                            t('recovery.save_first')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
