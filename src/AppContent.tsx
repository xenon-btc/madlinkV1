import React, { useState, useEffect } from 'react';
import { Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, WrenchIcon, Receipt, FileText, Settings as SettingsIcon, Menu, X, ListChecks, LogIn, Mail, FileInput as FileInvoice, Shield, MessageSquare, Search, Package, Bell, ClipboardList } from 'lucide-react';
import { useThemeStore } from './store/theme';
import { useAuthStore } from './store/auth';
import { useSubscriptionStore } from './store/subscription';
import { useAccountsStore } from './store/accounts';
import { AccountSwitcher } from './components/AccountSwitcher';

const ADMIN_EMAILS = [
  'contact@madlink.fr'
];

export function AppContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode } = useThemeStore();
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { hasActiveSubscription } = useSubscriptionStore();
  const { fetchAccounts, accounts } = useAccountsStore();
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const loadAccounts = async () => {
      if (user?.uid && accounts.length === 0) {
        await fetchAccounts(user.uid);
      }
    };

    loadAccounts();
  }, [user, accounts.length, fetchAccounts]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (!user) {
    return <Navigate to="/auth" />;
  }

  const navigationItems = isAdmin ? [
    { to: "/dashboard/admin", icon: Shield, label: "Administration" }
  ] : [
    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/dashboard/interventions", icon: WrenchIcon, label: "Interventions" },
    { to: "/dashboard/intervention-unitaire", icon: ClipboardList, label: "Intervention unitaire" },
    { to: "/dashboard/intervention-types", icon: ListChecks, label: "Articles" },
    { to: "/dashboard/consumables", icon: Package, label: "Consommables" },
    { to: "/dashboard/intervention-search", icon: Search, label: "Recherche d'intervention" },
    { to: "/dashboard/intervention-verification", icon: FileText, label: "Contrôle d'intervention" },
    { to: "/dashboard/expenses", icon: Receipt, label: "Dépenses" },
    { to: "/dashboard/reminders", icon: Bell, label: "Rappels" },
    { to: "/dashboard/invoice", icon: FileInvoice, label: "Facture" },
    { to: "/dashboard/reports", icon: FileText, label: "Rapports" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        )}
      </button>

      {/* Mobile Full Screen Menu */}
      <div className={`
        fixed inset-0 z-40 lg:hidden
        transform ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        transition-transform duration-300 ease-in-out
        bg-white dark:bg-gray-900 overflow-y-auto
      `}>
        <div className="flex flex-col min-h-screen p-6">
          {/* Header */}
          <div className="mb-6">
            <img
              src="/logo madlink.png"
              alt="MadlinK Logo"
              className="h-12 w-auto"
            />
          </div>

          {/* Account Switcher */}
          {!isAdmin && (
            <div className="mb-6">
              <AccountSwitcher />
            </div>
          )}

          {/* Grid Menu Items */}
          <div className="grid grid-cols-3 gap-3 mb-6 flex-1">
            {navigationItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors aspect-square"
              >
                <item.icon className="w-8 h-8 mb-2 text-gray-700 dark:text-gray-200" />
                <span className="text-xs text-center text-gray-700 dark:text-gray-200 leading-tight">
                  {item.label}
                </span>
              </Link>
            ))}
            {!isAdmin && (
              <Link
                to="/dashboard/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors aspect-square"
              >
                <MessageSquare className="w-8 h-8 mb-2 text-gray-700 dark:text-gray-200" />
                <span className="text-xs text-center text-gray-700 dark:text-gray-200 leading-tight">
                  Contact
                </span>
              </Link>
            )}
          </div>

          {/* Bottom Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <Link
              to="/dashboard/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center px-4 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <SettingsIcon className="w-5 h-5 mr-2 text-gray-700 dark:text-gray-200" />
              <span className="text-sm text-gray-700 dark:text-gray-200">Paramètres</span>
            </Link>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                signOut();
              }}
              className="flex items-center justify-center px-4 py-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <LogIn className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-600 dark:text-red-400">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block sticky top-0 inset-y-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 shadow-sm overflow-y-auto flex-col">
        <div className="p-6">
          <img
            src="/logo madlink.png"
            alt="MadlinK Logo"
            className="h-10 w-auto mb-2"
          />
          {isAdmin && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </span>
            </div>
          )}
        </div>

        {!isAdmin && (
          <AccountSwitcher />
        )}

        <nav className="flex-1">
          {navigationItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {!isAdmin && (
            <Link
              to="/dashboard/contact"
              className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Mail className="w-5 h-5 mr-3" />
              Contact
            </Link>
          )}
          <Link
            to="/dashboard/settings"
            className="flex items-center px-6 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <SettingsIcon className="w-5 h-5 mr-3" />
            Paramètres
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center px-6 py-3 text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <LogIn className="w-5 h-5 mr-3" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
