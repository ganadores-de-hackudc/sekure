import { useState, useEffect, useCallback } from 'react';
import {
    listKidsAccounts, createKidsAccount, deleteKidsAccount, updateKidsAccount,
    listKidsVault, createKidsVaultEntry, getKidsVaultEntry, deleteKidsVaultEntry,
} from '../api';
import type { KidsAccount, VaultEntry, VaultEntryWithPassword } from '../types';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import {
    Plus, ArrowLeft, Trash2, Eye, EyeOff, Copy, Globe, User, ExternalLink, X,
    Save, Lock, UserPlus, Pencil,
} from 'lucide-react';
import Favicon from './Favicon';

/* ─── Add Password Modal (for kid's vault) ─── */
function AddKidsPasswordModal({ kidId, onClose }: { kidId: number; onClose: () => void }) {
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
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-lg card animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('kids.add_password')}</h3>
                    <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
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
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
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
                        <button type="submit" disabled={loading || !title || !password} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" />{t('save.save')}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Kid Vault View (parent accessing kid's passwords) ─── */
function KidVaultView({ kid, onBack }: { kid: KidsAccount; onBack: () => void }) {
    const { t } = useLanguage();
    const [entries, setEntries] = useState<VaultEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
    const [decryptedPasswords, setDecryptedPasswords] = useState<Record<number, string>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try { setEntries(await listKidsVault(kid.id)); }
        catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    }, [kid.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleShowPassword = async (id: number) => {
        if (showPassword[id]) { setShowPassword({ ...showPassword, [id]: false }); return; }
        try {
            const entry = await getKidsVaultEntry(kid.id, id);
            setDecryptedPasswords({ ...decryptedPasswords, [id]: entry.password });
            setShowPassword({ ...showPassword, [id]: true });
        } catch (err: any) { toast.error(err.message); }
    };

    const handleCopyPassword = async (id: number) => {
        try {
            let pw = decryptedPasswords[id];
            if (!pw) { const entry = await getKidsVaultEntry(kid.id, id); pw = entry.password; setDecryptedPasswords({ ...decryptedPasswords, [id]: pw }); }
            await navigator.clipboard.writeText(pw);
            toast.success(t('vault.password_copied'));
        } catch (err: any) { toast.error(err.message); }
    };

    const handleDeleteEntry = async (id: number) => {
        if (!window.confirm(t('kids.confirm_delete_entry'))) return;
        try { await deleteKidsVaultEntry(kid.id, id); toast.success(t('kids.entry_deleted')); await fetchData(); }
        catch (err: any) { toast.error(err.message); }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            🧒 {kid.username}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {entries.length} {entries.length !== 1 ? t('vault.count_many') : t('vault.count_one')}
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />{t('kids.add_password')}
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : entries.length === 0 ? (
                <div className="card text-center py-16">
                    <Lock className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-500 text-lg">{t('kids.vault_empty')}</p>
                    <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">{t('kids.vault_empty_desc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entries.map(entry => (
                        <div key={entry.id} className="card-hover group flex flex-col h-full">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                                    {entry.url ? <Favicon url={entry.url} className="w-6 h-6" /> : <User className="w-6 h-6 text-gray-400" />}
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="font-semibold text-gray-800 dark:text-white truncate mb-1">{entry.title}</h3>
                                    {entry.username && <p className="text-sm text-gray-500 dark:text-gray-400 truncate"><span className="text-gray-400 dark:text-gray-500">{t('vault.user')}</span> {entry.username}</p>}
                                    {entry.url && <p className="text-sm text-gray-400 dark:text-gray-500 truncate">{entry.url}</p>}
                                </div>
                            </div>

                            <div className="mt-auto flex flex-col gap-3">
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-md border border-gray-100 dark:border-gray-700/50">
                                    <span className="font-mono-password text-sm text-gray-600 dark:text-gray-300 truncate">
                                        {showPassword[entry.id] ? decryptedPasswords[entry.id] : '•'.repeat(16)}
                                    </span>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button onClick={() => handleShowPassword(entry.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1" title={showPassword[entry.id] ? t('vault.hide') : t('vault.show')}>
                                            {showPassword[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => handleCopyPassword(entry.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1" title={t('vault.copy')}>
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-3 border-t border-gray-100 dark:border-gray-800">
                                    {entry.url && <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1.5" title={t('vault.open_url')}><ExternalLink className="w-4 h-4" /></a>}
                                    <button onClick={() => handleDeleteEntry(entry.id)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" title={t('vault.delete')}><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && <AddKidsPasswordModal kidId={kid.id} onClose={() => { setShowAddModal(false); fetchData(); }} />}
        </div>
    );
}

/* ─── Edit Kid Modal ─── */
function EditKidModal({ kid, onClose, onUpdated }: { kid: KidsAccount; onClose: () => void; onUpdated: () => void }) {
    const { t } = useLanguage();
    const [username, setUsername] = useState(kid.username);
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updates: { username?: string; password?: string } = {};
        if (username.trim() !== kid.username) updates.username = username.trim();
        if (password) updates.password = password;
        if (Object.keys(updates).length === 0) { onClose(); return; }

        setLoading(true);
        try {
            await updateKidsAccount(kid.id, updates);
            toast.success(t('kids.updated'));
            onUpdated();
            onClose();
        } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-md card animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('kids.edit_account')}</h3>
                    <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('auth.username')}</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input-field" autoFocus />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('kids.new_password')}</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={t('kids.new_password_placeholder')}
                                className="input-field pr-12"
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('kids.new_password_hint')}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('save.cancel')}</button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" />{t('kids.save_changes')}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Main SekureKids Component (for normal parent users) ─── */
export default function SekureKids() {
    const { t } = useLanguage();
    const [accounts, setAccounts] = useState<KidsAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedKid, setSelectedKid] = useState<KidsAccount | null>(null);
    const [editingKid, setEditingKid] = useState<KidsAccount | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try { setAccounts(await listKidsAccounts()); }
        catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername.trim() || !newPassword) return;
        setCreating(true);
        try {
            await createKidsAccount(newUsername.trim(), newPassword);
            toast.success(t('kids.created'));
            setNewUsername('');
            setNewPassword('');
            setShowCreate(false);
            await fetchData();
        } catch (err: any) { toast.error(err.message); } finally { setCreating(false); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('kids.confirm_delete'))) return;
        try { await deleteKidsAccount(id); toast.success(t('kids.deleted')); await fetchData(); }
        catch (err: any) { toast.error(err.message); }
    };

    if (selectedKid) {
        return <KidVaultView kid={selectedKid} onBack={() => { setSelectedKid(null); fetchData(); }} />;
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-gray-800 dark:text-white">
                        <img src="/sekure-kids-logo.svg" alt="Sekure Kids" className="h-9" />
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {t('kids.subtitle')}
                    </p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />{t('kids.create_account')}
                </button>
            </div>

            {/* Create form */}
            {showCreate && (
                <div className="card mb-6 animate-fade-in">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">{t('kids.create_account')}</h3>
                    <form onSubmit={handleCreate} className="space-y-3">
                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder={t('kids.username_placeholder')} className="input-field py-2 text-sm" autoFocus />
                        <div className="relative">
                            <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('kids.password_placeholder')} className="input-field py-2 text-sm pr-12" />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary py-2 text-sm flex-1">{t('save.cancel')}</button>
                            <button type="submit" disabled={creating || !newUsername.trim() || !newPassword} className="btn-primary py-2 text-sm flex-1">{t('kids.create_btn')}</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Accounts list */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : accounts.length === 0 ? (
                <div className="card text-center py-16">
                    <div className="text-6xl mb-4">👶</div>
                    <p className="text-gray-500 dark:text-gray-500 text-lg">{t('kids.no_accounts')}</p>
                    <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">{t('kids.no_accounts_desc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accounts.map(kid => (
                        <div
                            key={kid.id}
                            className="card-hover cursor-pointer group relative flex flex-col h-full"
                            onClick={() => setSelectedKid(kid)}
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                                    🧒
                                </div>
                                <div className="flex-1 min-w-0 pr-8">
                                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">{kid.username}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('kids.account_type')}</p>
                                </div>
                                <div className="absolute top-4 right-4 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-900 rounded-full p-0.5">
                                    <button onClick={e => { e.stopPropagation(); setEditingKid(kid); }} className="p-1.5 text-gray-400 hover:text-sekure-600 dark:text-gray-500 dark:hover:text-sekure-400" title={t('kids.edit_account')}>
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); handleDelete(kid.id); }} className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-300" title={t('kids.delete_account')}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit kid modal */}
            {editingKid && (
                <EditKidModal
                    kid={editingKid}
                    onClose={() => setEditingKid(null)}
                    onUpdated={fetchData}
                />
            )}
        </div>
    );
}
