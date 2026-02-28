import { useState, useEffect, useCallback } from 'react';
import {
    listGroups, createGroup, deleteGroup, getGroup,
    inviteToGroup, kickFromGroup,
    getPendingInvitations, acceptInvitation, ignoreInvitation,
    listGroupVault, createGroupVaultEntry, getGroupVaultEntry, deleteGroupVaultEntry,
} from '../api';
import type { Group, GroupInvitation, GroupPassword, GroupPasswordWithPassword } from '../types';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import {
    Users, Plus, Bell, ArrowLeft, Trash2, UserPlus, UserMinus,
    Eye, EyeOff, Copy, Globe, User, ExternalLink, Crown, X,
    Save, Lock,
} from 'lucide-react';

// ─── Add Password Modal ───
function AddGroupPasswordModal({ groupId, onClose }: { groupId: number; onClose: () => void }) {
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
            await createGroupVaultEntry(groupId, { title, username, url, password, notes });
            toast.success(t('groups.password_saved'));
            onClose();
        } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-lg card animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('groups.add_password')}</h3>
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

// ─── Group Vault View ───
function GroupVaultView({ group, onBack, currentUserId }: { group: Group; onBack: () => void; currentUserId: number }) {
    const { t } = useLanguage();
    const [entries, setEntries] = useState<GroupPassword[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
    const [decryptedPasswords, setDecryptedPasswords] = useState<Record<number, string>>({});
    const [showInviteInput, setShowInviteInput] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');
    const [groupData, setGroupData] = useState<Group>(group);

    const isOwner = group.owner_id === currentUserId;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [vault, g] = await Promise.all([listGroupVault(group.id), getGroup(group.id)]);
            setEntries(vault);
            setGroupData(g);
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    }, [group.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleShowPassword = async (id: number) => {
        if (showPassword[id]) { setShowPassword({ ...showPassword, [id]: false }); return; }
        try {
            const entry = await getGroupVaultEntry(group.id, id);
            setDecryptedPasswords({ ...decryptedPasswords, [id]: entry.password });
            setShowPassword({ ...showPassword, [id]: true });
        } catch (err: any) { toast.error(err.message); }
    };

    const handleCopyPassword = async (id: number) => {
        try {
            let pw = decryptedPasswords[id];
            if (!pw) { const entry = await getGroupVaultEntry(group.id, id); pw = entry.password; setDecryptedPasswords({ ...decryptedPasswords, [id]: pw }); }
            await navigator.clipboard.writeText(pw);
            toast.success(t('vault.password_copied'));
        } catch (err: any) { toast.error(err.message); }
    };

    const handleDeleteEntry = async (id: number) => {
        if (!window.confirm(t('groups.confirm_delete_entry'))) return;
        try { await deleteGroupVaultEntry(group.id, id); toast.success(t('groups.entry_deleted')); await fetchData(); }
        catch (err: any) { toast.error(err.message); }
    };

    const handleInvite = async () => {
        if (!inviteUsername.trim()) return;
        try {
            await inviteToGroup(group.id, inviteUsername.trim());
            toast.success(t('groups.invite_sent'));
            setInviteUsername('');
            setShowInviteInput(false);
        } catch (err: any) { toast.error(err.message); }
    };

    const handleKick = async (userId: number) => {
        try { await kickFromGroup(group.id, userId); toast.success(t('groups.kicked')); await fetchData(); }
        catch (err: any) { toast.error(err.message); }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="btn-ghost p-2"><ArrowLeft className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-sekure-600 dark:text-sekure-500" />
                            {groupData.name}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {entries.length} {entries.length !== 1 ? t('vault.count_many') : t('vault.count_one')}
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />{t('groups.add_password')}
                </button>
            </div>

            {/* Members section */}
            <div className="card mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {groupData.members.length} {groupData.members.length !== 1 ? t('groups.members') : t('groups.member')}
                    </h3>
                    {isOwner && (
                        <button onClick={() => setShowInviteInput(!showInviteInput)} className="btn-secondary flex items-center gap-1 text-sm py-1.5 px-3">
                            <UserPlus className="w-4 h-4" />{t('groups.invite')}
                        </button>
                    )}
                </div>
                {showInviteInput && (
                    <div className="flex items-center gap-2 mb-3 animate-fade-in">
                        <input type="text" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder={t('groups.invite_placeholder')} className="input-field py-2 text-sm flex-1" onKeyDown={e => e.key === 'Enter' && handleInvite()} />
                        <button onClick={handleInvite} className="btn-primary py-2 text-sm">{t('groups.invite_btn')}</button>
                    </div>
                )}
                <div className="flex flex-wrap gap-2">
                    {groupData.members.map(m => (
                        <div key={m.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">{m.username}</span>
                            {m.user_id === groupData.owner_id && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                            {isOwner && m.user_id !== currentUserId && (
                                <button onClick={() => handleKick(m.user_id)} className="text-red-400 hover:text-red-500 ml-1" title={t('groups.kick')}>
                                    <UserMinus className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Passwords */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : entries.length === 0 ? (
                <div className="card text-center py-16">
                    <Lock className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-500 text-lg">{t('groups.vault_empty')}</p>
                    <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">{t('groups.vault_empty_desc')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {entries.map(entry => (
                        <div key={entry.id} className="card-hover group">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                                    {entry.url ? <Globe className="w-6 h-6 text-gray-400" /> : <User className="w-6 h-6 text-gray-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 dark:text-white truncate mb-1">{entry.title}</h3>
                                    {entry.username && <p className="text-sm text-gray-500 dark:text-gray-400 truncate"><span className="text-gray-400 dark:text-gray-500">{t('vault.user')}</span> {entry.username}</p>}
                                    {entry.url && <p className="text-sm text-gray-400 dark:text-gray-500 truncate">{entry.url}</p>}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="font-mono-password text-sm text-gray-600 dark:text-gray-300">
                                            {showPassword[entry.id] ? decryptedPasswords[entry.id] : '•'.repeat(16)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                                        {t('groups.added_by')} {entry.added_by_username}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button onClick={() => handleShowPassword(entry.id)} className="btn-ghost p-2" title={showPassword[entry.id] ? t('vault.hide') : t('vault.show')}>
                                        {showPassword[entry.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => handleCopyPassword(entry.id)} className="btn-ghost p-2" title={t('vault.copy')}><Copy className="w-4 h-4" /></button>
                                    {entry.url && <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2" title={t('vault.open_url')}><ExternalLink className="w-4 h-4" /></a>}
                                    <button onClick={() => handleDeleteEntry(entry.id)} className="btn-ghost p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" title={t('vault.delete')}><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && <AddGroupPasswordModal groupId={group.id} onClose={() => { setShowAddModal(false); fetchData(); }} />}
        </div>
    );
}

// ─── Main Groups Component ───
export default function Groups({ currentUserId }: { currentUserId: number }) {
    const { t } = useLanguage();
    const [groups, setGroups] = useState<Group[]>([]);
    const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateInput, setShowCreateInput] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [g, inv] = await Promise.all([listGroups(), getPendingInvitations()]);
            setGroups(g);
            setInvitations(inv);
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            await createGroup(newGroupName.trim());
            setNewGroupName('');
            setShowCreateInput(false);
            await fetchData();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleDeleteGroup = async (id: number) => {
        if (!window.confirm(t('groups.confirm_delete'))) return;
        try { await deleteGroup(id); toast.success(t('groups.deleted')); await fetchData(); }
        catch (err: any) { toast.error(err.message); }
    };

    const handleAccept = async (id: number) => {
        try { await acceptInvitation(id); toast.success(t('groups.accepted')); await fetchData(); }
        catch (err: any) { toast.error(err.message); }
    };

    const handleIgnore = async (id: number) => {
        try { await ignoreInvitation(id); toast.success(t('groups.ignored')); await fetchData(); }
        catch (err: any) { toast.error(err.message); }
    };

    // If a group is selected, show the group vault
    if (selectedGroup) {
        return <GroupVaultView group={selectedGroup} onBack={() => { setSelectedGroup(null); fetchData(); }} currentUserId={currentUserId} />;
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-gray-800 dark:text-white">
                        <Users className="w-8 h-8 text-sekure-600 dark:text-sekure-500" />
                        {t('groups.title')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {groups.length} {groups.length !== 1 ? t('groups.members').replace('miembros', 'grupos').replace('members', 'groups').replace('membros', 'grupos') : t('groups.member').replace('miembro', 'grupo').replace('member', 'group').replace('membro', 'grupo')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Notifications bell */}
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative btn-secondary flex items-center gap-2 ${showNotifications ? 'border-sekure-500 text-sekure-600 dark:text-sekure-400' : ''}`}
                    >
                        <Bell className="w-5 h-5" />
                        <span className="hidden sm:inline">{t('groups.notifications')}</span>
                        {invitations.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {invitations.length}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setShowCreateInput(!showCreateInput)} className="btn-primary flex items-center gap-2">
                        <Plus className="w-5 h-5" />{t('groups.create')}
                    </button>
                </div>
            </div>

            {/* Create group input */}
            {showCreateInput && (
                <div className="card mb-6 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder={t('groups.group_name')} className="input-field py-2 text-sm flex-1" onKeyDown={e => e.key === 'Enter' && handleCreateGroup()} autoFocus />
                        <button onClick={handleCreateGroup} className="btn-primary py-2 text-sm">{t('groups.create_btn')}</button>
                    </div>
                </div>
            )}

            {/* Notifications panel */}
            {showNotifications && (
                <div className="card mb-6 animate-fade-in">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2 mb-4">
                        <Bell className="w-4 h-4" />
                        {t('groups.notifications')}
                        {invitations.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {invitations.length}
                            </span>
                        )}
                    </h3>
                    {invitations.length === 0 ? (
                        <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">{t('groups.no_notifications')}</p>
                    ) : (
                        <div className="space-y-3">
                            {invitations.map(inv => (
                                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        {t('groups.invitation_msg_pre')}
                                        <span className="font-semibold">{inv.inviter_username}</span>
                                        {t('groups.invitation_msg_mid')}
                                        <span className="font-semibold">{inv.group_name}</span>
                                    </p>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => handleAccept(inv.id)} className="btn-primary py-1.5 px-4 text-sm">{t('groups.accept')}</button>
                                        <button onClick={() => handleIgnore(inv.id)} className="btn-secondary py-1.5 px-4 text-sm">{t('groups.ignore')}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Groups list */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : groups.length === 0 ? (
                <div className="card text-center py-16">
                    <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-500 text-lg">{t('groups.empty')}</p>
                    <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">{t('groups.empty_desc')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {groups.map(group => (
                        <div
                            key={group.id}
                            className="card-hover cursor-pointer group"
                            onClick={() => setSelectedGroup(group)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-sekure-50 dark:bg-sekure-600/10 rounded-md flex items-center justify-center flex-shrink-0">
                                    <Users className="w-6 h-6 text-sekure-600 dark:text-sekure-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">{group.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {group.members.length} {group.members.length !== 1 ? t('groups.members') : t('groups.member')}
                                        <span className="mx-2">·</span>
                                        <span className="text-gray-400 dark:text-gray-500">{t('groups.owner')}: {group.owner_username}</span>
                                    </p>
                                </div>
                                {group.owner_id === currentUserId && (
                                    <button onClick={e => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="btn-ghost p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" title={t('groups.delete_group')}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
