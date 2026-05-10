'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { LayoutDashboard, Package, ChefHat, ShoppingCart, Truck, Settings, LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/components/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Estoque', icon: Package, href: '/dashboard/inventory' },
    { name: 'Produção', icon: ChefHat, href: '/dashboard/production' },
    { name: 'Vendas', icon: ShoppingCart, href: '/dashboard/sales' },
    { name: 'Expedição', icon: Truck, href: '/dashboard/shipping' },
    { name: 'Configurações', icon: Settings, href: '/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-slate-900 text-slate-300 w-64 fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
          !sidebarOpen && '-translate-x-full lg:translate-x-0 lg:w-20'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 bg-slate-950 text-amber-500 font-bold text-xl overflow-hidden">
            <span className={cn('transition-opacity duration-300', !sidebarOpen && 'lg:opacity-0')}>PanificaPro</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-6 px-3 space-y-2">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors group"
                title={item.name}
              >
                <item.icon className="w-6 h-6 shrink-0" />
                <span className={cn('ml-3 font-medium transition-opacity duration-300', !sidebarOpen && 'lg:opacity-0')}>
                  {item.name}
                </span>
              </a>
            ))}
          </nav>

          {/* User & Logout */}
          <div className="p-4 bg-slate-950/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-3 rounded-lg hover:bg-red-900/20 hover:text-red-400 transition-colors group"
            >
              <LogOut className="w-6 h-6 shrink-0" />
              <span className={cn('ml-3 font-medium transition-opacity duration-300', !sidebarOpen && 'lg:opacity-0')}>
                Sair
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn('flex-1 flex flex-col transition-all duration-300', sidebarOpen ? 'lg:pl-64' : 'lg:pl-20')}>
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
            {sidebarOpen ? <X /> : <Menu />}
          </button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border border-amber-200">
              {user?.name?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
