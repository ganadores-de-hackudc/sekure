import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { logout } from '../api';
import { useTheme } from '../ThemeContext';
import toast from 'react-hot-toast';
import {
    KeyRound, ShieldCheck, Archive,
    LogOut, Menu, X, User, Moon, Sun,
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    username: string;
    onLogout: () => void;
}

const navItems = [
    { to: '/generator', icon: KeyRound, label: 'Generador' },
    { to: '/checker', icon: ShieldCheck, label: 'Verificador' },
    { to: '/vault', icon: Archive, label: 'Bóveda' },
];

export default function Layout({ children, username, onLogout }: LayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Sesión cerrada');
            onLogout();
        } catch {
            toast.error('Error al cerrar sesión');
            onLogout();
        }
    };

    const ThemeToggle = () => (
        <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
    );

    return (
        <div className="min-h-screen flex bg-beige-50 dark:bg-gray-950">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-10">
                    <img src="/sekure-longlogo.svg" alt="Sekure" className="h-10" />
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                isActive ? 'sidebar-link-active' : 'sidebar-link'
                            }
                        >
                            <Icon className="w-5 h-5" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
                    <div className="flex items-center gap-2 px-4 py-2 mb-2">
                        <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{username}</span>
                    </div>
                    <button onClick={handleLogout} className="sidebar-link text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-600/10">
                        <LogOut className="w-5 h-5" />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/40 dark:bg-black/60" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 z-10 flex flex-col animate-fade-in shadow-xl">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-3">
                                <img src="/sekure-longlogo.svg" alt="Sekure" className="h-10" />
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="btn-ghost">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <nav className="flex-1 space-y-2">
                            {navItems.map(({ to, icon: Icon, label }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) =>
                                        isActive ? 'sidebar-link-active' : 'sidebar-link'
                                    }
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </NavLink>
                            ))}
                        </nav>

                        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-4">
                            <div className="flex items-center gap-2 px-4 py-2 mb-2">
                                <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{username}</span>
                            </div>
                            <button onClick={handleLogout} className="sidebar-link text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-600/10">
                                <LogOut className="w-5 h-5" />
                                Cerrar sesión
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Top bar with theme toggle */}
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="btn-ghost lg:hidden">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2 lg:hidden">
                            <img src="/sekure-logo.svg" alt="Sekure" className="h-6 w-6" />
                            <span className="font-bold text-gray-800 dark:text-white">Sekure</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={handleLogout} className="btn-ghost text-red-500 dark:text-red-400 lg:hidden">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-8 lg:p-10 overflow-y-auto">
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
