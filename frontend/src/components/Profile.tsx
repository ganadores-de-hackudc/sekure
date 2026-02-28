import { useState } from 'react';
import { changeUsername, changePassword, deleteAccount, clearToken } from '../api';
import { useLanguage } from '../i18n';
import toast from 'react-hot-toast';
import { User, Key, Trash2, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';

interface ProfileProps {
    username: string;
    onLogout: () => void;
    onUsernameChanged: (newUsername: string) => void;
}

type Section = 'menu' | 'username' | 'password' | 'delete';

function PasswordInput({
    value, onChange, show, onToggle, placeholder, autoFocus,
}: {
    value: string; onChange: (v: string) => void; show: boolean;
    onToggle: () => void; placeholder: string; autoFocus?: boolean;
}) {
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="input-field pr-12 font-mono-password"
                autoFocus={autoFocus}
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
        </div>
    );
}

export default function Profile({ username, onLogout, onUsernameChanged }: ProfileProps) {
    const { t } = useLanguage();
    const [section, setSection] = useState<Section>('menu');

    // Change username state
    const [newUsername, setNewUsername] = useState('');
    const [usernamePassword, setUsernamePassword] = useState('');
    const [usernameLoading, setUsernameLoading] = useState(false);
    const [showUsernamePw, setShowUsernamePw] = useState(false);

    // Change password state
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    // Delete account state
    const [deletePw, setDeletePw] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeletePw, setShowDeletePw] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const handleChangeUsername = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername.trim() || !usernamePassword) return;
        setUsernameLoading(true);
        try {
            const res = await changeUsername(newUsername.trim(), usernamePassword);
            toast.success(t('profile.username_changed'));
            onUsernameChanged(res.username);
            setNewUsername('');
            setUsernamePassword('');
            setSection('menu');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setUsernameLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPw !== confirmPw) {
            toast.error(t('auth.passwords_mismatch'));
            return;
        }
        if (newPw.length < 8) {
            toast.error(t('auth.password_min_length'));
            return;
        }
        setPasswordLoading(true);
        try {
            await changePassword(currentPw, newPw);
            toast.success(t('profile.password_changed'));
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setSection('menu');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (deleteConfirmText !== 'ELIMINAR') {
            toast.error(t('profile.type_delete_confirm'));
            return;
        }
        setDeleteLoading(true);
        try {
            await deleteAccount(deletePw);
            toast.success(t('profile.account_deleted'));
            clearToken();
            onLogout();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeleteLoading(false);
        }
    };


    if (section === 'username') {
        return (
            <div className="max-w-lg mx-auto">
                <button onClick={() => setSection('menu')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {t('profile.back')}
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-3">
                    <User className="w-6 h-6 text-sekure-500" />
                    {t('profile.change_username')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('profile.change_username_desc')}</p>

                <form onSubmit={handleChangeUsername} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">{t('profile.current_username')}</label>
                        <input type="text" value={username} disabled className="input-field opacity-60 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">{t('profile.new_username')}</label>
                        <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder={t('profile.new_username_placeholder')} className="input-field" autoFocus />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">{t('profile.confirm_password')}</label>
                        <PasswordInput value={usernamePassword} onChange={setUsernamePassword} show={showUsernamePw} onToggle={() => setShowUsernamePw(!showUsernamePw)} placeholder={t('profile.enter_password')} />
                    </div>
                    <button type="submit" disabled={usernameLoading || !newUsername.trim() || !usernamePassword} className="btn-primary w-full">
                        {usernameLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : t('profile.save_changes')}
                    </button>
                </form>
            </div>
        );
    }

    if (section === 'password') {
        return (
            <div className="max-w-lg mx-auto">
                <button onClick={() => setSection('menu')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {t('profile.back')}
                </button>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-3">
                    <Key className="w-6 h-6 text-sekure-500" />
                    {t('profile.change_password')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('profile.change_password_desc')}</p>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">{t('profile.current_password')}</label>
                        <PasswordInput value={currentPw} onChange={setCurrentPw} show={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} placeholder={t('profile.enter_current_password')} autoFocus />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">{t('profile.new_password')}</label>
                        <PasswordInput value={newPw} onChange={setNewPw} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} placeholder={t('profile.enter_new_password')} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">{t('profile.confirm_new_password')}</label>
                        <PasswordInput value={confirmPw} onChange={v => setConfirmPw(v)} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} placeholder={t('profile.confirm_new_password_placeholder')} />
                    </div>
                    <button type="submit" disabled={passwordLoading || !currentPw || !newPw || !confirmPw} className="btn-primary w-full">
                        {passwordLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : t('profile.save_changes')}
                    </button>
                </form>
            </div>
        );
    }

    if (section === 'delete') {
        return (
            <div className="max-w-lg mx-auto">
                <button onClick={() => setSection('menu')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {t('profile.back')}
                </button>
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-3">
                    <Trash2 className="w-6 h-6" />
                    {t('profile.delete_account')}
                </h2>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-2">⚠️ {t('profile.delete_warning')}</p>
                    <ul className="text-red-600 dark:text-red-400 text-sm list-disc list-inside space-y-1">
                        <li>{t('profile.delete_warning_1')}</li>
                        <li>{t('profile.delete_warning_2')}</li>
                        <li>{t('profile.delete_warning_3')}</li>
                    </ul>
                </div>

                <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">{t('profile.confirm_password')}</label>
                        <PasswordInput value={deletePw} onChange={setDeletePw} show={showDeletePw} onToggle={() => setShowDeletePw(!showDeletePw)} placeholder={t('profile.enter_password')} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">
                            {t('profile.type_delete')} <span className="font-bold text-red-600">ELIMINAR</span>
                        </label>
                        <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="ELIMINAR" className="input-field" />
                    </div>
                    <button type="submit" disabled={deleteLoading || !deletePw || deleteConfirmText !== 'ELIMINAR'} className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {deleteLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : t('profile.delete_account_btn')}
                    </button>
                </form>
            </div>
        );
    }

    // Main menu
    return (
        <div className="max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-4 mb-10 text-center">
                <div className="w-32 h-32 bg-gradient-to-br from-sekure-400 to-sekure-600 rounded-3xl flex items-center justify-center text-white text-5xl font-bold shadow-xl shadow-sekure-200 dark:shadow-sekure-900/30">
                    {username.charAt(0).toUpperCase()}
                </div>
                <div className="mt-2">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{username}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-1.5">
                        <Shield className="w-4 h-4" /> {t('profile.title')}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {/* Change username */}
                <button
                    onClick={() => setSection('username')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-sekure-300 dark:hover:border-sekure-600 hover:shadow-md transition-all text-left group"
                >
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white">{t('profile.change_username')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.change_username_short')}</p>
                    </div>
                </button>

                {/* Change password */}
                <button
                    onClick={() => setSection('password')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-sekure-300 dark:hover:border-sekure-600 hover:shadow-md transition-all text-left group"
                >
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                        <Key className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white">{t('profile.change_password')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.change_password_short')}</p>
                    </div>
                </button>

                {/* Delete account */}
                <button
                    onClick={() => setSection('delete')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-red-200 dark:border-red-900/30 hover:border-red-400 dark:hover:border-red-600 hover:shadow-md transition-all text-left group"
                >
                    <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                        <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-red-600 dark:text-red-400">{t('profile.delete_account')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.delete_account_short')}</p>
                    </div>
                </button>
            </div>
        </div>
    );
}
