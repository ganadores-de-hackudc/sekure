import { useState } from 'react';
import { generatePassword } from '../api';
import type { GenerateRequest, GenerateResponse } from '../types';
import toast from 'react-hot-toast';
import SaveToVaultModal from './SaveToVaultModal';
import {
    KeyRound, Copy, RefreshCw, Save, Zap,
    Hash, Type, AtSign, Shuffle,
} from 'lucide-react';

const methodOptions = [
    { value: 'random', label: 'Aleatorio', icon: Shuffle, desc: 'Caracteres aleatorios criptográficamente seguros' },
    { value: 'passphrase', label: 'Frase', icon: Type, desc: 'Palabras aleatorias fáciles de recordar' },
    { value: 'pin', label: 'PIN', icon: Hash, desc: 'Solo dígitos numéricos' },
];

export default function Generator() {
    const [config, setConfig] = useState<GenerateRequest>({
        length: 20,
        method: 'random',
        include_uppercase: true,
        include_lowercase: true,
        include_digits: true,
        include_symbols: true,
        num_words: 5,
        separator: '-',
    });
    const [result, setResult] = useState<GenerateResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);

    const generate = async () => {
        setLoading(true);
        try {
            const res = await generatePassword(config);
            setResult(res);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (result?.password) {
            navigator.clipboard.writeText(result.password);
            toast.success('Contraseña copiada');
        }
    };

    const strengthColor = (strength: string) => {
        switch (strength) {
            case 'Muy débil': return 'text-red-500 dark:text-red-400';
            case 'Débil': return 'text-orange-500 dark:text-orange-400';
            case 'Moderada': return 'text-yellow-600 dark:text-yellow-400';
            case 'Fuerte': return 'text-sekure-600 dark:text-sekure-400';
            case 'Muy fuerte': return 'text-sekure-500 dark:text-sekure-300';
            default: return 'text-gray-500 dark:text-gray-400';
        }
    };

    const strengthBg = (strength: string) => {
        switch (strength) {
            case 'Muy débil': return 'bg-red-500';
            case 'Débil': return 'bg-orange-500';
            case 'Moderada': return 'bg-yellow-500';
            case 'Fuerte': return 'bg-sekure-500';
            case 'Muy fuerte': return 'bg-sekure-400';
            default: return 'bg-gray-500';
        }
    };

    const strengthPercent = (strength: string) => {
        switch (strength) {
            case 'Muy débil': return 10;
            case 'Débil': return 30;
            case 'Moderada': return 55;
            case 'Fuerte': return 80;
            case 'Muy fuerte': return 100;
            default: return 0;
        }
    };

    return (
        <div>
            <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-gray-800 dark:text-white">
                    <KeyRound className="w-8 h-8 text-sekure-600 dark:text-sekure-500" />
                    Generador de Contraseñas
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Genera contraseñas robustas con distintos métodos criptográficamente seguros
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Configuration */}
                <div className="card space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Configuración</h3>

                    {/* Method selector */}
                    <div className="grid grid-cols-3 gap-2">
                        {methodOptions.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={() => setConfig({ ...config, method: value as any })}
                                className={`flex flex-col items-center gap-2 p-3 rounded-md border transition-all duration-200 ${config.method === value
                                    ? 'border-sekure-500 bg-sekure-50 text-sekure-700 dark:bg-sekure-600/10 dark:text-sekure-400'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-500 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{label}</span>
                            </button>
                        ))}
                    </div>

                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {methodOptions.find(m => m.value === config.method)?.desc}
                    </p>

                    {/* Random config */}
                    {config.method === 'random' && (
                        <>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm text-gray-600 dark:text-gray-300">Longitud</label>
                                    <span className="text-sm font-mono text-sekure-600 dark:text-sekure-400">{config.length}</span>
                                </div>
                                <input
                                    type="range"
                                    min={8}
                                    max={64}
                                    value={config.length}
                                    onChange={(e) => setConfig({ ...config, length: +e.target.value })}
                                    className="w-full accent-sekure-500"
                                />
                                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600 mt-1">
                                    <span>8</span>
                                    <span>64</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm text-gray-600 dark:text-gray-300">Incluir caracteres</label>
                                {[
                                    { key: 'include_uppercase', label: 'Mayúsculas (A-Z)', icon: 'A' },
                                    { key: 'include_lowercase', label: 'Minúsculas (a-z)', icon: 'a' },
                                    { key: 'include_digits', label: 'Números (0-9)', icon: '1' },
                                    { key: 'include_symbols', label: 'Símbolos (!@#$...)', icon: '@' },
                                ].map(({ key, label, icon }) => (
                                    <label
                                        key={key}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={(config as any)[key]}
                                                onChange={(e) =>
                                                    setConfig({ ...config, [key]: e.target.checked })
                                                }
                                                className="sr-only peer"
                                            />
                                            <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer-checked:bg-sekure-600 transition-colors" />
                                            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-4 transition-transform shadow-sm" />
                                        </div>
                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-600 dark:text-gray-300">
                                            {icon}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white transition-colors">
                                            {label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Passphrase config */}
                    {config.method === 'passphrase' && (
                        <>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm text-gray-600 dark:text-gray-300">Número de palabras</label>
                                    <span className="text-sm font-mono text-sekure-600 dark:text-sekure-400">{config.num_words}</span>
                                </div>
                                <input
                                    type="range"
                                    min={3}
                                    max={10}
                                    value={config.num_words}
                                    onChange={(e) => setConfig({ ...config, num_words: +e.target.value })}
                                    className="w-full accent-sekure-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-600 dark:text-gray-300 block mb-2">Separador</label>
                                <div className="flex gap-2">
                                    {['-', '.', '_', ' ', '~'].map((sep) => (
                                        <button
                                            key={sep}
                                            onClick={() => setConfig({ ...config, separator: sep })}
                                            className={`w-10 h-10 rounded-md font-mono text-lg flex items-center justify-center border transition-colors ${config.separator === sep
                                                ? 'border-sekure-500 bg-sekure-50 text-sekure-700 dark:bg-sekure-600/10 dark:text-sekure-400'
                                                : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            {sep === ' ' ? '⎵' : sep}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* PIN config */}
                    {config.method === 'pin' && (
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-sm text-gray-600 dark:text-gray-300">Longitud del PIN</label>
                                <span className="text-sm font-mono text-sekure-600 dark:text-sekure-400">{config.length}</span>
                            </div>
                            <input
                                type="range"
                                min={4}
                                max={12}
                                value={config.length}
                                onChange={(e) => setConfig({ ...config, length: +e.target.value })}
                                className="w-full accent-sekure-500"
                            />
                        </div>
                    )}

                    <button
                        onClick={generate}
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Zap className="w-5 h-5" />
                                Generar Contraseña
                            </>
                        )}
                    </button>
                </div>

                {/* Result */}
                <div className="card space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Resultado</h3>

                    {result ? (
                        <div className="animate-fade-in space-y-6">
                            {/* Password display */}
                            <div className="relative bg-gray-50 dark:bg-gray-800/50 rounded-md p-4 border border-gray-200 dark:border-gray-700">
                                <p className="font-mono-password text-lg md:text-xl break-all pr-10 text-gray-800 dark:text-white select-all">
                                    {result.password}
                                </p>
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute top-3 right-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                    title="Copiar"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Strength meter */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`font-semibold ${strengthColor(result.strength)}`}>
                                        {result.strength}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {result.entropy} bits de entropía
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${strengthBg(result.strength)}`}
                                        style={{ width: `${strengthPercent(result.strength)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 text-center border border-gray-100 dark:border-transparent">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Entropía</p>
                                    <p className="text-lg font-bold text-sekure-600 dark:text-sekure-400">{result.entropy} bits</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 text-center border border-gray-100 dark:border-transparent">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tiempo de crackeo</p>
                                    <p className="text-lg font-bold text-gray-800 dark:text-white truncate">{result.crack_time}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button onClick={generate} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerar
                                </button>
                                <button
                                    onClick={() => setShowSaveModal(true)}
                                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Guardar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
                            <KeyRound className="w-16 h-16 mb-4 strokeWidth-1" />
                            <p className="text-lg">Configura y genera una contraseña</p>
                            <p className="text-sm text-gray-300 dark:text-gray-700 mt-1">
                                Usa los controles de la izquierda
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showSaveModal && result && (
                <SaveToVaultModal
                    password={result.password}
                    onClose={() => setShowSaveModal(false)}
                />
            )}
        </div>
    );
}
