import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { logout } from '../api';
import toast from 'react-hot-toast';
import {
    KeyRound, ShieldCheck, Archive,
    LogOut, Menu, X, User,
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

    return (
        <div className="min-h-screen flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-72 bg-gray-900/50 border-r border-gray-800 p-6">
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

                <div className="border-t border-gray-800 pt-4 mt-4">
                    <div className="flex items-center gap-2 px-4 py-2 mb-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-400 truncate">{username}</span>
                    </div>
                    <button onClick={handleLogout} className="sidebar-link text-red-400 hover:text-red-300 hover:bg-red-600/10">
                        <LogOut className="w-5 h-5" />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
                    <aside className="relative w-72 bg-gray-900 border-r border-gray-800 p-6 z-10 flex flex-col animate-fade-in">
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

                        <div className="border-t border-gray-800 pt-4 mt-4">
                            <div className="flex items-center gap-2 px-4 py-2 mb-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-400 truncate">{username}</span>
                            </div>
                            <button onClick={handleLogout} className="sidebar-link text-red-400 hover:text-red-300 hover:bg-red-600/10">
                                <LogOut className="w-5 h-5" />
                                Cerrar sesión
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main content */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Mobile header */}
                <header className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
                    <button onClick={() => setSidebarOpen(true)} className="btn-ghost">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/sekure-logo.svg" alt="Sekure" className="h-6 w-6" />
                        <span className="font-bold">Sekure</span>
                    </div>
                    <button onClick={handleLogout} className="btn-ghost text-red-400">
                        <LogOut className="w-5 h-5" />
                    </button>
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
