import { useState } from 'react';
import { getVaultEntry, createShareLink } from '../api';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import {
    X, Link2, Clock, Globe, Users, Copy, Check,
    Shield, Plus, Trash2,
} from 'lucide-react';

interface ShareModalProps {
    entryId: number;
    entryTitle: string;
    entryUrl?: string;
    onClose: () => void;
}

type ExpiryOption = '1h' | '1d' | '1w' | '1m';
type AccessMode = 'anyone' | 'specific';

export default function ShareModal({ entryId, entryTitle, entryUrl, onClose }: ShareModalProps) {
    const { t } = useLanguage();
    const [expiry, setExpiry] = useState<ExpiryOption>('1d');
    const [accessMode, setAccessMode] = useState<AccessMode>('anyone');
    const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
    const [newUser, setNewUser] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    const expiryOptions: { value: ExpiryOption; label: string }[] = [
        { value: '1h', label: t('share.expiry_1h') },
        { value: '1d', label: t('share.expiry_1d') },
        { value: '1w', label: t('share.expiry_1w') },
        { value: '1m', label: t('share.expiry_1m') },
    ];

    const addUser = () => {
        const u = newUser.trim().toLowerCase();
        if (u && !allowedUsers.includes(u)) {
            setAllowedUsers([...allowedUsers, u]);
            setNewUser('');
        }
    };

    const removeUser = (idx: number) => {
        setAllowedUsers(allowedUsers.filter((_, i) => i !== idx));
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // 1. Fetch decrypted password from vault
            const entry = await getVaultEntry(entryId);

            // 2. Build the plaintext payload as JSON
            const payload = JSON.stringify({
                title: entry.title,
                username: entry.username,
                url: entry.url,
                password: entry.password,
                notes: entry.notes,
            });

            // 3. Generate a random AES-256 key for the share link
            const shareKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            const rawKey = await crypto.subtle.exportKey('raw', shareKey);

            // 4. Encrypt the payload
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                shareKey,
                new TextEncoder().encode(payload)
            );

            // 5. Encode to base64
            const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
            const ivB64 = btoa(String.fromCharCode(...iv));
            const keyB64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));

            // 6. Send encrypted data to backend
            const result = await createShareLink({
                encrypted_data: encryptedB64,
                iv: ivB64,
                expires_in: expiry,
                access_mode: accessMode,
                allowed_usernames: accessMode === 'specific' ? allowedUsers : [],
            });

            // 7. Build the link with the key in the fragment
            const origin = window.location.origin;
            const link = `${origin}/share/${result.id}#${keyB64}`;
            setGeneratedLink(link);
        } catch (err: any) {
            toast.error(err.message || 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        toast.success(t('share.link_copied'));
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-sekure-500" />
                        {t('share.title')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Password preview */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                            <Globe className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-gray-800 dark:text-white truncate">{entryTitle}</p>
                            {entryUrl && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{entryUrl}</p>}
                        </div>
                    </div>

                    {!generatedLink ? (
                        <>
                            {/* Expiry */}
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                                    <Clock className="w-4 h-4" />
                                    {t('share.expiry')}
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {expiryOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setExpiry(opt.value)}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border ${expiry === opt.value
                                                    ? 'bg-sekure-50 dark:bg-sekure-900/20 border-sekure-300 dark:border-sekure-600 text-sekure-700 dark:text-sekure-400'
                                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Access mode */}
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-2">
                                    <Shield className="w-4 h-4" />
                                    {t('share.access')}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setAccessMode('anyone')}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${accessMode === 'anyone'
                                                ? 'bg-sekure-50 dark:bg-sekure-900/20 border-sekure-300 dark:border-sekure-600 text-sekure-700 dark:text-sekure-400'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                            }`}
                                    >
                                        <Globe className="w-4 h-4" />
                                        {t('share.anyone')}
                                    </button>
                                    <button
                                        onClick={() => setAccessMode('specific')}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${accessMode === 'specific'
                                                ? 'bg-sekure-50 dark:bg-sekure-900/20 border-sekure-300 dark:border-sekure-600 text-sekure-700 dark:text-sekure-400'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                            }`}
                                    >
                                        <Users className="w-4 h-4" />
                                        {t('share.specific_users')}
                                    </button>
                                </div>
                            </div>

                            {/* Allowed users */}
                            {accessMode === 'specific' && (
                                <div className="animate-fade-in">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">
                                        {t('share.allowed_users')}
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={newUser}
                                            onChange={e => setNewUser(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUser())}
                                            placeholder={t('share.username_placeholder')}
                                            className="input-field flex-1 py-2 text-sm"
                                        />
                                        <button onClick={addUser} className="btn-primary py-2 px-3 text-sm">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {allowedUsers.length > 0 && (
                                        <div className="space-y-1.5">
                                            {allowedUsers.map((u, idx) => (
                                                <div key={idx} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
                                                    <span className="text-gray-700 dark:text-gray-300">{u}</span>
                                                    <button onClick={() => removeUser(idx)} className="text-gray-400 hover:text-red-500">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Generate button */}
                            <button
                                onClick={handleGenerate}
                                disabled={loading || (accessMode === 'specific' && allowedUsers.length === 0)}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Link2 className="w-4 h-4" />
                                        {t('share.generate')}
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        /* Generated link result */
                        <div className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-2 flex items-center gap-1.5">
                                    <Check className="w-4 h-4" />
                                    {t('share.link_ready')}
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
                                    <p className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono">{generatedLink}</p>
                                </div>
                            </div>

                            <button onClick={handleCopy} className="btn-primary w-full flex items-center justify-center gap-2">
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? t('share.copied') : t('share.copy_link')}
                            </button>

                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                                {t('share.security_note')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
