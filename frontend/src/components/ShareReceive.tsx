import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getShareLink, createVaultEntry } from '../api';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import {
    Link2, Globe, User, Key, StickyNote,
    Check, X, ShieldAlert, Clock, AlertTriangle,
} from 'lucide-react';

interface SharedPassword {
    title: string;
    username: string;
    url: string;
    password: string;
    notes: string;
}

export default function ShareReceive() {
    const { shareId } = useParams<{ shareId: string }>();
    const navigate = useNavigate();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<{ type: 'expired' | 'denied' | 'invalid' | 'error'; message: string } | null>(null);
    const [data, setData] = useState<SharedPassword | null>(null);
    const [creatorUsername, setCreatorUsername] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchAndDecrypt = async () => {
            try {
                if (!shareId) {
                    setError({ type: 'invalid', message: t('share.invalid_link') });
                    return;
                }

                // Get the key from the URL fragment
                const keyB64 = window.location.hash.slice(1);
                if (!keyB64) {
                    setError({ type: 'invalid', message: t('share.invalid_link') });
                    return;
                }

                // Fetch encrypted data from backend
                let result;
                try {
                    result = await getShareLink(shareId);
                } catch (err: any) {
                    if (err.message?.includes('caducado') || err.message?.includes('expired')) {
                        setError({ type: 'expired', message: t('share.link_expired') });
                    } else if (err.message?.includes('acceso') || err.message?.includes('access')) {
                        setError({ type: 'denied', message: t('share.no_access') });
                    } else {
                        setError({ type: 'error', message: err.message || t('share.error') });
                    }
                    return;
                }

                setCreatorUsername(result.creator_username);

                // Decode from base64
                const encryptedBytes = Uint8Array.from(atob(result.encrypted_data), c => c.charCodeAt(0));
                const ivBytes = Uint8Array.from(atob(result.iv), c => c.charCodeAt(0));
                const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0));

                // Import the key
                const shareKey = await crypto.subtle.importKey(
                    'raw',
                    keyBytes,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['decrypt']
                );

                // Decrypt
                const decrypted = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: ivBytes },
                    shareKey,
                    encryptedBytes
                );

                const payload: SharedPassword = JSON.parse(new TextDecoder().decode(decrypted));
                setData(payload);
            } catch (err: any) {
                setError({ type: 'invalid', message: t('share.invalid_link') });
            } finally {
                setLoading(false);
            }
        };

        fetchAndDecrypt();
    }, [shareId]);

    const handleAccept = async () => {
        if (!data) return;
        setSaving(true);
        try {
            await createVaultEntry({
                title: data.title,
                username: data.username,
                url: data.url,
                password: data.password,
                notes: data.notes,
            });
            toast.success(t('share.added_to_vault'));
            navigate('/vault');
        } catch (err: any) {
            toast.error(err.message || 'Error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">{t('share.loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        const icons = {
            expired: <Clock className="w-16 h-16 text-amber-400" />,
            denied: <ShieldAlert className="w-16 h-16 text-red-400" />,
            invalid: <AlertTriangle className="w-16 h-16 text-gray-400" />,
            error: <AlertTriangle className="w-16 h-16 text-red-400" />,
        };

        return (
            <div className="max-w-md mx-auto text-center py-16">
                <div className="flex justify-center mb-6">{icons[error.type]}</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {error.type === 'expired' ? t('share.expired_title') :
                        error.type === 'denied' ? t('share.denied_title') :
                            t('share.error_title')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{error.message}</p>
                <button onClick={() => navigate('/vault')} className="btn-primary">
                    {t('share.go_to_vault')}
                </button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-sekure-400 to-sekure-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sekure-200 dark:shadow-sekure-900/30">
                    <Link2 className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                    {t('share.received_title')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {t('share.shared_by')} <span className="font-semibold text-gray-700 dark:text-gray-300">{creatorUsername}</span>
                </p>
            </div>

            {/* Password card preview */}
            <div className="card mb-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                        <Globe className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{data.title}</h3>
                        {data.url && <p className="text-sm text-gray-400 dark:text-gray-500">{data.url}</p>}
                    </div>
                </div>

                <div className="space-y-3 text-sm">
                    {data.username && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-400 dark:text-gray-500">{t('vault.user')}</span>
                            <span className="font-mono">{data.username}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-400 dark:text-gray-500">{t('share.password_label')}</span>
                        <span className="font-mono-password">{'•'.repeat(Math.min(data.password.length, 20))}</span>
                    </div>
                    {data.notes && (
                        <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                            <StickyNote className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-400 dark:text-gray-500">{t('share.notes_label')}</span>
                            <span className="text-sm">{data.notes}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => navigate('/vault')}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                    <X className="w-4 h-4" />
                    {t('share.decline')}
                </button>
                <button
                    onClick={handleAccept}
                    disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                    {saving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Check className="w-4 h-4" />
                            {t('share.accept')}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
