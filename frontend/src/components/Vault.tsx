import { useState, useEffect, useCallback, useRef } from 'react';
import {
    listVault, getVaultEntry, deleteVaultEntry, toggleFavorite,
    listTags, createTag, deleteTag,
} from '../api';
import type { VaultEntry, VaultEntryWithPassword, Tag } from '../types';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import SaveToVaultModal from './SaveToVaultModal';
import ShareModal from './ShareModal';
import Favicon from './Favicon';
import {
    Archive, Search, Star, Plus, Tag as TagIcon,
    Eye, EyeOff, Copy, Trash2, ExternalLink,
    Globe, User, StickyNote, X, Filter, Share2, Pencil,
} from 'lucide-react';
import { requireBiometric } from '../biometric';

const tagColors = ['#9b1b2f', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Vault() {
    const { t } = useLanguage();
    const [entries, setEntries] = useState<VaultEntry[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editEntry, setEditEntry] = useState<VaultEntryWithPassword | null>(null);
    const [selectedEntry, setSelectedEntry] = useState<VaultEntryWithPassword | null>(null);
    const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
    const [decryptedPasswords, setDecryptedPasswords] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [showTagCreator, setShowTagCreator] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#9b1b2f');
    const [showFilters, setShowFilters] = useState(false);
    const [shareEntry, setShareEntry] = useState<VaultEntry | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Debounce search input (300ms)
    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [vaultData, tagsData] = await Promise.all([
                listVault({ search: debouncedSearch, tags: filterTags, favorites_only: favoritesOnly }),
                listTags(),
            ]);
            setEntries(vaultData);
            setTags(tagsData);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filterTags, favoritesOnly]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleToggleFavorite = async (id: number) => {
        try { await toggleFavorite(id); await fetchData(); } catch (err: any) { toast.error(err.message); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm(t('vault.confirm_delete'))) return;
        try {
            await deleteVaultEntry(id);
            toast.success(t('vault.deleted'));
            await fetchData();
            if (selectedEntry?.id === id) setSelectedEntry(null);
        } catch (err: any) { toast.error(err.message); }
    };

    const handleShowPassword = async (id: number) => {
        if (showPassword[id]) { setShowPassword({ ...showPassword, [id]: false }); return; }
        try {
            await requireBiometric();
            const entry = await getVaultEntry(id);
            setDecryptedPasswords({ ...decryptedPasswords, [id]: entry.password });
            setShowPassword({ ...showPassword, [id]: true });
        } catch (err: any) { toast.error(err.message); }
    };

    const handleCopyPassword = async (id: number) => {
        try {
            await requireBiometric();
            let pw = decryptedPasswords[id];
            if (!pw) { const entry = await getVaultEntry(id); pw = entry.password; setDecryptedPasswords({ ...decryptedPasswords, [id]: pw }); }
            await navigator.clipboard.writeText(pw);
            toast.success(t('vault.password_copied'));
        } catch (err: any) { toast.error(err.message); }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            await createTag(newTagName.trim(), newTagColor);
            toast.success(t('vault.tag_created'));
            setNewTagName('');
            setShowTagCreator(false);
            await fetchData();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleDeleteTag = async (id: number) => {
        try {
            await deleteTag(id);
            const deletedTag = tags.find(t => t.id === id);
            if (deletedTag && filterTags.includes(deletedTag.name)) {
                setFilterTags(filterTags.filter(n => n !== deletedTag.name));
            }
            await fetchData();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleEdit = async (id: number) => {
        try {
            const entry = await getVaultEntry(id);
            setEditEntry(entry);
        } catch (err: any) { toast.error(err.message); }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-gray-800 dark:text-white">
                        <Archive className="w-8 h-8 text-sekure-600 dark:text-sekure-500" />
                        {t('vault.title')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {entries.length} {entries.length !== 1 ? t('vault.count_many') : t('vault.count_one')}
                    </p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />{t('vault.add')}
                </button>
            </div>

            <div className="card mb-6 space-y-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('vault.search')} className="input-field pl-11" />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-2 ${showFilters ? 'border-sekure-500 text-sekure-600 dark:text-sekure-400' : ''}`}>
                        <Filter className="w-4 h-4" /><span className="hidden sm:inline">{t('vault.filters')}</span>
                    </button>
                </div>

                {showFilters && (
                    <div className="animate-fade-in space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-4 flex-wrap">
                            <button onClick={() => setFavoritesOnly(!favoritesOnly)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${favoritesOnly ? 'bg-yellow-50 text-yellow-600 border border-yellow-300 dark:bg-yellow-600/15 dark:text-yellow-400 dark:border-yellow-600/30' : 'bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                                <Star className={`w-4 h-4 ${favoritesOnly ? 'fill-yellow-400' : ''}`} />{t('vault.favorites_only')}
                            </button>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{t('vault.tags')}</span>
                                <button onClick={() => setFilterTags([])}
                                    className={`badge border transition-colors ${filterTags.length === 0 ? 'border-sekure-500 bg-sekure-50 text-sekure-700 dark:bg-sekure-600/10 dark:text-sekure-400' : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'}`}>
                                    {t('vault.all')}
                                </button>
                                {tags.map((tag) => {
                                    const isActive = filterTags.includes(tag.name);
                                    return (
                                        <button key={tag.id} onClick={() => setFilterTags(isActive ? filterTags.filter(n => n !== tag.name) : [...filterTags, tag.name])}
                                            className={`badge border transition-colors group ${isActive ? 'bg-opacity-20 border-opacity-50' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}
                                            style={{ backgroundColor: isActive ? `${tag.color}20` : undefined, borderColor: isActive ? tag.color : undefined, color: isActive ? tag.color : undefined }}>
                                            {tag.name}
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag.id); }} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                        </button>
                                    );
                                })}
                                <button onClick={() => setShowTagCreator(!showTagCreator)}
                                    className="badge border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:border-gray-400 transition-colors">
                                    <Plus className="w-3 h-3 mr-1" />{t('vault.new_tag')}
                                </button>
                            </div>
                        </div>
                        {showTagCreator && (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <input type="text" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder={t('vault.tag_name')} className="input-field py-2 text-sm flex-1" onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()} />
                                <div className="flex gap-1">
                                    {tagColors.map((color) => (
                                        <button key={color} onClick={() => setNewTagColor(color)} className={`w-6 h-6 rounded-full border-2 transition-transform ${newTagColor === color ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                                    ))}
                                </div>
                                <button onClick={handleCreateTag} className="btn-primary py-2 text-sm">{t('vault.create')}</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : entries.length === 0 ? (
                <div className="card text-center py-16">
                    <Archive className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-500 text-lg">{t('vault.empty')}</p>
                    <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">{t('vault.empty_desc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {entries.map((entry) => (
                        <div key={entry.id} className="card-hover group flex flex-col h-full">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center flex-shrink-0">
                                    {entry.url ? <Favicon url={entry.url} className="w-6 h-6" /> : <User className="w-6 h-6 text-gray-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-semibold text-gray-800 dark:text-white truncate pr-2">{entry.title}</h3>
                                        <button onClick={() => handleToggleFavorite(entry.id)} className="transition-colors flex-shrink-0">
                                            <Star className={`w-4 h-4 ${entry.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-400 dark:text-gray-600 dark:hover:text-yellow-400'}`} />
                                        </button>
                                    </div>
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

                                {entry.tags.length > 0 && (
                                    <div className="flex gap-1.5 flex-wrap">
                                        {entry.tags.map((tag) => (
                                            <span key={tag.id} className="badge text-[10px]" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>{tag.name}</span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-3 border-t border-gray-100 dark:border-gray-800">
                                    <button onClick={() => handleEdit(entry.id)} className="btn-ghost p-1.5" title={t('vault.edit')}><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => setShareEntry(entry)} className="btn-ghost p-1.5" title={t('share.title')}><Share2 className="w-4 h-4" /></button>
                                    {entry.url && <a href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1.5" title={t('vault.open_url')}><ExternalLink className="w-4 h-4" /></a>}
                                    <button onClick={() => handleDelete(entry.id)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" title={t('vault.delete')}><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && <SaveToVaultModal onClose={() => { setShowAddModal(false); fetchData(); }} />}
            {editEntry && <SaveToVaultModal editEntry={editEntry} onClose={() => { setEditEntry(null); fetchData(); }} />}
            {shareEntry && <ShareModal entryId={shareEntry.id} entryTitle={shareEntry.title} entryUrl={shareEntry.url} onClose={() => setShareEntry(null)} />}
        </div>
    );
}
