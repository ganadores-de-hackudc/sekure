import { useState } from 'react';
import { checkPassword } from '../api';
import type { CheckResponse } from '../types';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';

import {
    ShieldCheck, Eye, EyeOff, AlertTriangle,
    CheckCircle2, XCircle, Search,
} from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

const COLORS = ['#9b1b2f', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

export default function Checker() {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [result, setResult] = useState<CheckResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();
    const { t } = useLanguage();

    const handleCheck = async () => {
        if (!password) {
            toast.error(t('check.enter_password'));
            return;
        }
        setLoading(true);
        try {
            const res = await checkPassword(password);
            setResult(res);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCheck();
    };

    const strengthColor = (score: number) => {
        switch (score) {
            case 0: return 'text-red-500 dark:text-red-400';
            case 1: return 'text-orange-500 dark:text-orange-400';
            case 2: return 'text-yellow-600 dark:text-yellow-400';
            case 3: return 'text-sekure-600 dark:text-sekure-400';
            case 4: return 'text-sekure-500 dark:text-sekure-300';
            default: return 'text-gray-500 dark:text-gray-400';
        }
    };

    const strengthBg = (score: number) => {
        switch (score) {
            case 0: return 'bg-red-500';
            case 1: return 'bg-orange-500';
            case 2: return 'bg-yellow-500';
            case 3: return 'bg-sekure-500';
            case 4: return 'bg-sekure-400';
            default: return 'bg-gray-500';
        }
    };

    const charDistNames: Record<string, string> = {
        lowercase: t('check.lowercase'),
        uppercase: t('check.uppercase'),
        digits: t('check.digits_label'),
        symbols: t('check.symbols_label'),
    };

    const pieData = result
        ? Object.entries(result.char_distribution)
            .filter(([_, v]) => v > 0)
            .map(([name, value]) => ({
                name: charDistNames[name] || t('check.other'),
                value,
            }))
        : [];

    const tooltipStyle = {
        background: theme === 'dark' ? '#1f2937' : '#ffffff',
        border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
        borderRadius: '6px',
        color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    };

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-gray-800 dark:text-white">
                    <ShieldCheck className="w-8 h-8 text-sekure-600 dark:text-sekure-500" />
                    {t('check.title')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{t('check.subtitle')}</p>
            </div>

            <div className="card mb-6">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} placeholder={t('check.placeholder')} className="input-field pr-12 font-mono-password" />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    <button onClick={handleCheck} disabled={loading || !password} className="btn-primary flex items-center gap-2">
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Search className="w-5 h-5" /><span className="hidden sm:inline">{t('check.verify')}</span></>}
                    </button>
                </div>
            </div>

            {result && (
                <div className="animate-fade-in space-y-6">
                    {result.is_breached && (
                        <div className="card border-red-300 bg-red-50 dark:border-red-600/50 dark:bg-red-600/10">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-600/20 rounded-md flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-red-600 dark:text-red-400">{t('check.breached')}</h3>
                                    <p className="text-red-600/80 dark:text-red-300/80 mt-1">
                                        {t('check.breached_desc_pre')}<span className="font-bold text-red-600 dark:text-red-300">{result.breach_count.toLocaleString()}</span>{t('check.breached_desc_post')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!result.is_breached && (
                        <div className="card border-sekure-200 bg-sekure-50 dark:border-sekure-600/30 dark:bg-sekure-600/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-sekure-100 dark:bg-sekure-600/20 rounded-md flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-6 h-6 text-sekure-600 dark:text-sekure-400" /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-sekure-700 dark:text-sekure-400">{t('check.safe')}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">{t('check.safe_desc')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="card space-y-5">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('check.strength')}</h3>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-xl font-bold ${strengthColor(result.strength_score)}`}>{result.strength}</span>
                                    <span className="text-gray-500 dark:text-gray-400">{result.strength_score}/4</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-700 ${strengthBg(result.strength_score)}`} style={{ width: `${(result.strength_score + 1) * 20}%` }} />
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 text-center border border-gray-100 dark:border-transparent">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('check.estimated_crack')}</p>
                                <p className="text-lg font-bold text-gray-800 dark:text-white truncate">{result.crack_time}</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('check.recommendations')}</h4>
                                {result.feedback.map((msg, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                        {msg.includes('⚠️') || msg.includes('Evita') || msg.includes('Añade') || msg.includes('corta') || msg.includes('Considera') ? (
                                            <XCircle className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 text-sekure-600 dark:text-sekure-400 flex-shrink-0 mt-0.5" />
                                        )}
                                        <span className="text-gray-600 dark:text-gray-300">{msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="card">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">{t('check.char_distribution')}</h3>
                                {pieData.length > 0 && (
                                    <div className="flex items-center gap-4">
                                        <div className="w-40 h-40">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={60} paddingAngle={3} dataKey="value" stroke="none">
                                                    {pieData.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                                                </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            {pieData.map((item, index) => (
                                                <div key={item.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                        <span className="text-sm text-gray-600 dark:text-gray-300">{item.name}</span>
                                                    </div>
                                                    <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
