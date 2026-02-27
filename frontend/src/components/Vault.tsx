import { useState, useEffect, useCallback } from 'react';
import {
    listVault, getVaultEntry, deleteVaultEntry, toggleFavorite,
    listTags, createTag, deleteTag,
} from '../api';
import type { VaultEntry, VaultEntryWithPassword, Tag } from '../types';
import toast from 'react-hot-toast';
import SaveToVaultModal from './SaveToVaultModal';
import {
    Archive, Search, Star, Plus, Tag as TagIcon,
    Eye, EyeOff, Copy, Trash2, ExternalLink,
    Globe, User, StickyNote, X, Filter,
} from 'lucide-react';

export default function Vault() {
    const [entries, setEntries] = useState<VaultEntry[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [search, setSearch] = useState('');
    const [filterTag, setFilterTag] = useState('');
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<VaultEntryWithPassword | null>(null);
    const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
    const [decryptedPasswords, setDecryptedPasswords] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [showTagCreator, setShowTagCreator] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#9b1b2f');
    const [showFilters, setShowFilters] = useState(false);

    const tagColors = ['#9b1b2f', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [vaultData, tagsData] = await Promise.all([
                listVault({ search, tag: filterTag, favorites_only: favoritesOnly }),
                listTags(),
            ]);
            setEntries(vaultData);
            setTags(tagsData);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [search, filterTag, favoritesOnly]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleFavorite = async (id: number) => {
        try {
            await toggleFavorite(id);
            await fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar esta entrada?')) return;
        try {
            await deleteVaultEntry(id);
            toast.success('Entrada eliminada');
            await fetchData();
            if (selectedEntry?.id === id) setSelectedEntry(null);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleShowPassword = async (id: number) => {
        if (showPassword[id]) {
            setShowPassword({ ...showPassword, [id]: false });
            return;
        }
        try {
            const entry = await getVaultEntry(id);
            setDecryptedPasswords({ ...decryptedPasswords, [id]: entry.password });
            setShowPassword({ ...showPassword, [id]: true });
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleCopyPassword = async (id: number) => {
        try {
            let pw = decryptedPasswords[id];
            if (!pw) {
                const entry = await getVaultEntry(id);
                pw = entry.password;
                setDecryptedPasswords({ ...decryptedPasswords, [id]: pw });
            }
            await navigator.clipboard.writeText(pw);
            toast.success('Contraseña copiada');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            await createTag(newTagName.trim(), newTagColor);
            toast.success('Etiqueta creada');
            setNewTagName('');
            setShowTagCreator(false);
            await fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteTag = async (id: number) => {
        try {
            await deleteTag(id);
            if (filterTag) setFilterTag('');
            await fetchData();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <Archive className="w-8 h-8 text-sekure-500" />
                        Bóveda
                    </h2>
                    <p className="text-gray-400 mt-1">
                        {entries.length} contraseña{entries.length !== 1 ? 's' : ''} almacenada{entries.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Añadir
                </button>
            </div>

            {/* Search & Filters */}
            <div className="card mb-6 space-y-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por título, usuario o URL..."
                            className="input-field pl-11"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary flex items-center gap-2 ${showFilters ? 'border-sekure-500 text-sekure-400' : ''}`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filtros</span>
                    </button>
                </div>

                {showFilters && (
                    <div className="animate-fade-in space-y-3 pt-2 border-t border-gray-800">
                        <div className="flex items-center gap-4 flex-wrap">
                            <button
                                onClick={() => setFavoritesOnly(!favoritesOnly)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${favoritesOnly
                                    ? 'bg-yellow-600/15 text-yellow-400 border border-yellow-600/30'
                                    : 'bg-gray-800 text-gray-400 border border-gray-700'
                                    }`}
                            >
                                <Star className={`w-4 h-4 ${favoritesOnly ? 'fill-yellow-400' : ''}`} />
                                Solo favoritos
                            </button>

                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-gray-400">Etiquetas:</span>
                                <button
                                    onClick={() => setFilterTag('')}
                                    className={`badge border transition-colors ${!filterTag
                                        ? 'border-sekure-500 bg-sekure-600/10 text-sekure-400'
                                        : 'border-gray-700 text-gray-400'
                                        }`}
                                >
                                    Todas
                                </button>
                                {tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => setFilterTag(filterTag === tag.name ? '' : tag.name)}
                                        className={`badge border transition-colors group ${filterTag === tag.name
                                            ? 'bg-opacity-20 border-opacity-50'
                                            : 'border-gray-700 hover:border-gray-600'
                                            }`}
                                        style={{
                                            backgroundColor: filterTag === tag.name ? `${tag.color}20` : undefined,
                                            borderColor: filterTag === tag.name ? tag.color : undefined,
                                            color: filterTag === tag.name ? tag.color : '#9ca3af',
                                        }}
                                    >
                                        {tag.name}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTag(tag.id);
                                            }}
                                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </button>
                                ))}
                                <button
                                    onClick={() => setShowTagCreator(!showTagCreator)}
                                    className="badge border border-dashed border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-400 transition-colors"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Nueva
                                </button>
                            </div>
                        </div>

                        {showTagCreator && (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder="Nombre de la etiqueta"
                                    className="input-field py-2 text-sm flex-1"
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                                />
                                <div className="flex gap-1">
                                    {tagColors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setNewTagColor(color)}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform ${newTagColor === color ? 'border-white scale-110' : 'border-transparent'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <button onClick={handleCreateTag} className="btn-primary py-2 text-sm">
                                    Crear
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Entries list */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-sekure-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : entries.length === 0 ? (
                <div className="card text-center py-16">
                    <Archive className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No hay contraseñas almacenadas</p>
                    <p className="text-gray-600 text-sm mt-1">
                        Genera una contraseña y guárdala, o añade una manualmente
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="card-hover group"
                        >
                            <div className="flex items-start gap-4">
                                {/* Icon */}
                                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                                    {entry.url ? (
                                        <Globe className="w-6 h-6 text-gray-400" />
                                    ) : (
                                        <User className="w-6 h-6 text-gray-400" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-white truncate">{entry.title}</h3>
                                        <button
                                            onClick={() => handleToggleFavorite(entry.id)}
                                            className="transition-colors"
                                        >
                                            <Star
                                                className={`w-4 h-4 ${entry.is_favorite
                                                    ? 'text-yellow-400 fill-yellow-400'
                                                    : 'text-gray-600 hover:text-yellow-400'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {entry.username && (
                                        <p className="text-sm text-gray-400 truncate">
                                            <span className="text-gray-500">Usuario:</span> {entry.username}
                                        </p>
                                    )}
                                    {entry.url && (
                                        <p className="text-sm text-gray-500 truncate">
                                            {entry.url}
                                        </p>
                                    )}

                                    {/* Password */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="font-mono-password text-sm text-gray-300">
                                            {showPassword[entry.id] ? decryptedPasswords[entry.id] : '•'.repeat(16)}
                                        </span>
                                    </div>

                                    {/* Tags */}
                                    {entry.tags.length > 0 && (
                                        <div className="flex gap-1.5 mt-2 flex-wrap">
                                            {entry.tags.map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="badge text-[10px]"
                                                    style={{
                                                        backgroundColor: `${tag.color}20`,
                                                        color: tag.color,
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <button
                                        onClick={() => handleShowPassword(entry.id)}
                                        className="btn-ghost p-2"
                                        title={showPassword[entry.id] ? 'Ocultar' : 'Mostrar'}
                                    >
                                        {showPassword[entry.id] ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleCopyPassword(entry.id)}
                                        className="btn-ghost p-2"
                                        title="Copiar contraseña"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    {entry.url && (
                                        <a
                                            href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-ghost p-2"
                                            title="Abrir URL"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleDelete(entry.id)}
                                        className="btn-ghost p-2 text-red-400 hover:text-red-300"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <SaveToVaultModal
                    onClose={() => {
                        setShowAddModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}
