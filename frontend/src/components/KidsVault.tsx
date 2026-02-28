import { useState, useEffect, useCallback } from 'react';
import {
    listKidsVault, createKidsVaultEntry, getKidsVaultEntry, deleteKidsVaultEntry,
} from '../api';
import type { VaultEntry } from '../types';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, Eye, EyeOff, Copy, Globe, User, ExternalLink, X,
    Save, Lock, Star,
} from 'lucide-react';

/* ─── Add Password Modal ─── */
function AddPasswordModal({ kidId, onClose }: { kidId: number; onClose: () => void }) {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [username, setUsername] = useState('');
    const [url, setUrl] = useState('');
    const [password, setPassword] = useState('');
    const [notes, setNotes] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !password) { toast.error(t('save.required')); return; }
        setLoading(true);
        try {
            await createKidsVaultEntry(kidId, { title, username, url, password, notes });
            toast.success(t('kids.password_saved'));
            onClose();
        } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto border-2 border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300">✨ {t('kids.add_password')}</h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.entry_title')}</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t('save.entry_title_placeholder')} className="input-field" autoFocus />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.user_email')}</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('save.user_email_placeholder')} className="input-field" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.url')}</label>
                        <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder={t('save.url_placeholder')} className="input-field" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.password')}</label>
                        <div className="relative">
                            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={t('save.password_placeholder')} className="input-field pr-12 font-mono-password" />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.notes')}</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('save.notes_placeholder')} className="input-field resize-none h-20" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('save.cancel')}</button>
                        <button type="submit" disabled={loading || !title || !password} className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" />{t('save.save')}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── KidsVault: The vault view for kid users ─── */
export default function KidsVault({ userId }: { userId: number }) {
    const { t } = useLanguage();
    const [entries, setEntries] = useState<VaultEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
    const [decryptedPasswords, setDecryptedPasswords] = useState<Record<number, string>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try { setEntries(await listKidsVault(userId)); }
        catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    }, [userId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleShowPassword = async (id: number) => {
        if (showPassword[id]) { setShowPassword({ ...showPassword, [id]: false }); return; }
        try {
            const entry = await getKidsVaultEntry(userId, id);
            setDecryptedPasswords({ ...decryptedPasswords, [id]: entry.password });
            setShowPassword({ ...showPassword, [id]: true });
        } catch (err: any) { toast.error(err.message); }
    };

    const handleCopyPassword = async (id: number) => {
        try {
            let pw = decryptedPasswords[id];
            if (!pw) { const entry = await getKidsVaultEntry(userId, id); pw = entry.password; setDecryptedPasswords({ ...decryptedPasswords, [id]: pw }); }
            await navigator.clipboard.writeText(pw);
            toast.success(t('vault.password_copied'));
        } catch (err: any) { toast.error(err.message); }
    };

    const handleDeleteEntry = async (id: number) => {
        if (!window.confirm(t('kids.confirm_delete_entry'))) return;
        try { await deleteKidsVaultEntry(userId, id); toast.success(t('kids.entry_deleted')); await fetchData(); }
        catch (err: any) { toast.error(err.message); }
    };

    const emojis = ['🔑', '🔒', '🛡️', '⭐', '🌈', '🎮', '🎵', '📱'];
    const getEmoji = (idx: number) => emojis[idx % emojis.length];

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                        {t('vault.title')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {entries.length} {entries.length !== 1 ? t('vault.count_many') : t('vault.count_one')}
                    </p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="py-2.5 px-5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2 shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
                    <Plus className="w-5 h-5" />{t('kids.add_password')}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : entries.length === 0 ? (
                <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl text-center py-16 border-2 border-dashed border-purple-200 dark:border-purple-800">
                    <div className="text-6xl mb-4">🔐</div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">{t('kids.vault_empty')}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t('kids.vault_empty_desc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entries.map((entry, idx) => (
                        <div key={entry.id} className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm rounded-2xl p-4 border border-purple-100 dark:border-purple-800/30 hover:border-purple-300 dark:hover:border-purple-600 transition-all group shadow-sm hover:shadow-md flex flex-col h-full">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                                    {getEmoji(idx)}
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="font-bold text-gray-800 dark:text-white truncate mb-1">{entry.title}</h3>
                                    {entry.username && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{entry.username}</p>}
                                    {entry.url && <p className="text-sm text-purple-400 dark:text-purple-500 truncate">{entry.url}</p>}
                                </div>
                            </div>

                            <div className="mt-auto flex flex-col gap-3">
                                <div className="flex items-center justify-between bg-white dark:bg-gray-800/50 p-2.5 rounded-xl border border-purple-50 dark:border-purple-900/20">
                                    <span className="font-mono-password text-sm text-gray-600 dark:text-gray-300 truncate">
                                        {showPassword[entry.id] ? decryptedPasswords[entry.id] : '●'.repeat(12)}
                                    </span>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button onClick={() => handleShowPassword(entry.id)} className="p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors" title={showPassword[entry.id] ? t('vault.hide') : t('vault.show')}>
                                            {showPassword[entry.id] ? <EyeOff className="w-4 h-4 text-purple-500" /> : <Eye className="w-4 h-4 text-purple-500" />}
                                        </button>
                                        <button onClick={() => handleCopyPassword(entry.id)} className="p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors" title={t('vault.copy')}>
                                            <Copy className="w-4 h-4 text-purple-500" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-3 border-t border-purple-50 dark:border-purple-900/20">
                                    {entry.url && <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/30 transition-colors" title={t('vault.open_url')}><ExternalLink className="w-4 h-4 text-purple-500" /></a>}
                                    <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors" title={t('vault.delete')}><Trash2 className="w-4 h-4 text-red-400" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && <AddPasswordModal kidId={userId} onClose={() => { setShowAddModal(false); fetchData(); }} />}
        </div>
    );
}
