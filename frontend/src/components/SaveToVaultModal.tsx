import { useState, useEffect } from 'react';
import { createVaultEntry, updateVaultEntry, listTags } from '../api';
import type { Tag, VaultEntryWithPassword } from '../types';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import { X, Save, Eye, EyeOff, Star } from 'lucide-react';

interface SaveToVaultModalProps {
    password?: string;
    editEntry?: VaultEntryWithPassword | null;
    onClose: () => void;
}

export default function SaveToVaultModal({ password: initialPassword, editEntry, onClose }: SaveToVaultModalProps) {
    const { t } = useLanguage();
    const isEdit = !!editEntry;
    const [title, setTitle] = useState(editEntry?.title || '');
    const [username, setUsername] = useState(editEntry?.username || '');
    const [url, setUrl] = useState(editEntry?.url || '');
    const [password, setPassword] = useState(editEntry?.password || initialPassword || '');
    const [notes, setNotes] = useState(editEntry?.notes || '');
    const [isFavorite, setIsFavorite] = useState(editEntry?.is_favorite || false);
    const [selectedTags, setSelectedTags] = useState<number[]>(editEntry?.tags?.map(t => t.id) || []);
    const [tags, setTags] = useState<Tag[]>([]);
    const [showPassword, setShowPassword] = useState(!!initialPassword || isEdit);
    const [loading, setLoading] = useState(false);

    useEffect(() => { listTags().then(setTags).catch(() => { }); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !password) { toast.error(t('save.required')); return; }
        setLoading(true);
        try {
            if (isEdit && editEntry) {
                await updateVaultEntry(editEntry.id, { title, username, url, password, notes, is_favorite: isFavorite, tag_ids: selectedTags });
                toast.success(t('save.updated'));
            } else {
                await createVaultEntry({ title, username, url, password, notes, is_favorite: isFavorite, tag_ids: selectedTags });
                toast.success(t('save.saved'));
            }
            onClose();
        } catch (err: any) { toast.error(err.message); } finally { setLoading(false); }
    };

    const toggleTag = (id: number) => {
        setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 dark:bg-black/60" onClick={onClose} />
            <div className="relative w-full max-w-lg card animate-slide-up max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{isEdit ? t('save.edit_title') : t('save.title')}</h3>
                    <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.entry_title')}</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('save.entry_title_placeholder')} className="input-field" autoFocus />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.user_email')}</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('save.user_email_placeholder')} className="input-field" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.url')}</label>
                        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('save.url_placeholder')} className="input-field" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.password')}</label>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('save.password_placeholder')} className="input-field pr-12 font-mono-password" autoComplete="off" data-1p-ignore data-lpignore="true" data-form-type="other" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">{t('save.notes')}</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('save.notes_placeholder')} className="input-field resize-none h-20" />
                    </div>

                    <button type="button" onClick={() => setIsFavorite(!isFavorite)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${isFavorite ? 'bg-yellow-50 text-yellow-600 border border-yellow-300 dark:bg-yellow-600/15 dark:text-yellow-400 dark:border-yellow-600/30' : 'bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400' : ''}`} />
                        {isFavorite ? t('save.favorite') : t('save.mark_favorite')}
                    </button>

                    {tags.length > 0 && (
                        <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300 block mb-2">{t('save.tags')}</label>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                                        className={`badge border transition-colors ${selectedTags.includes(tag.id) ? 'border-opacity-50' : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'}`}
                                        style={{ backgroundColor: selectedTags.includes(tag.id) ? `${tag.color}20` : undefined, borderColor: selectedTags.includes(tag.id) ? tag.color : undefined, color: selectedTags.includes(tag.id) ? tag.color : undefined }}>
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('save.cancel')}</button>
                        <button type="submit" disabled={loading || !title || !password} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" />{isEdit ? t('save.update') : t('save.save')}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
