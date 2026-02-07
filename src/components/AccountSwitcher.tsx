import React, { useState, useRef, useEffect } from 'react';
import { Building2, Plus, ChevronDown, Pencil, Trash2, Check, X } from 'lucide-react';
import { useAccountsStore } from '../store/accounts';
import { useAuthStore } from '../store/auth';

const ACCOUNT_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Orange
];

export function AccountSwitcher() {
  const { user } = useAuthStore();
  const {
    accounts,
    currentAccountId,
    loading,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    setCurrentAccount,
    getCurrentAccount
  } = useAccountsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountColor, setNewAccountColor] = useState(ACCOUNT_COLORS[0]);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountColor, setEditAccountColor] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentAccount = getCurrentAccount();

  useEffect(() => {
    if (user?.uid) {
      fetchAccounts(user.uid);
    }
  }, [user, fetchAccounts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setEditingAccountId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateAccount = async () => {
    if (!user?.uid || !newAccountName.trim()) return;

    try {
      await createAccount(user.uid, newAccountName.trim(), newAccountColor);
      setNewAccountName('');
      setNewAccountColor(ACCOUNT_COLORS[0]);
      setShowCreateForm(false);
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
    }
  };

  const handleUpdateAccount = async (accountId: string) => {
    if (!editAccountName.trim()) return;

    try {
      await updateAccount(accountId, editAccountName.trim(), editAccountColor);
      setEditingAccountId(null);
      setEditAccountName('');
      setEditAccountColor('');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du compte:', error);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account?.isDefault) return;

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte "${account?.name}" ? Toutes les données associées seront perdues.`)) {
      try {
        await deleteAccount(accountId);
      } catch (error) {
        console.error('Erreur lors de la suppression du compte:', error);
      }
    }
  };

  const startEditing = (account: any) => {
    setEditingAccountId(account.id);
    setEditAccountName(account.name);
    setEditAccountColor(account.color);
  };

  if (loading || !currentAccount) {
    return (
      <div className="px-6 py-3">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700" ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
          style={{ backgroundColor: currentAccount.color }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: currentAccount.color }}
            />
            <div className="text-left">
              <div className="font-medium text-white text-sm">
                {currentAccount.name}
              </div>
              {currentAccount.isDefault && (
                <div className="text-xs text-white text-opacity-80">
                  Compte principal
                </div>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {/* Liste des comptes */}
            <div className="p-2">
              {accounts.map((account) => (
                <div key={account.id}>
                  {editingAccountId === account.id ? (
                    <div className="p-2 space-y-2">
                      <input
                        type="text"
                        value={editAccountName}
                        onChange={(e) => setEditAccountName(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Nom du compte"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {ACCOUNT_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditAccountColor(color)}
                              className={`w-6 h-6 rounded-full border-2 ${
                                editAccountColor === color ? 'border-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => handleUpdateAccount(account.id)}
                          className="p-1 text-green-600 hover:text-green-800 dark:text-green-400"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingAccountId(null)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 rounded transition-colors" style={{
                      backgroundColor: currentAccountId === account.id ? account.color : 'transparent'
                    }}>
                      <button
                        onClick={() => {
                          setCurrentAccount(account.id);
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: account.color }}
                        />
                        <div>
                          <div className={`text-sm font-medium ${
                            currentAccountId === account.id ? 'text-white' : 'text-gray-900 dark:text-white'
                          }`}>
                            {account.name}
                          </div>
                          {account.isDefault && (
                            <div className={`text-xs ${
                              currentAccountId === account.id ? 'text-white text-opacity-80' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              Principal
                            </div>
                          )}
                        </div>
                      </button>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditing(account)}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {!account.isDefault && (
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Formulaire de création */}
            <div className="border-t border-gray-200 dark:border-gray-600 p-2">
              {showCreateForm ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Nom du nouveau compte (ex: Orange, Free...)"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {ACCOUNT_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewAccountColor(color)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            newAccountColor === color ? 'border-gray-900 dark:border-white' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleCreateAccount}
                      disabled={!newAccountName.trim()}
                      className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewAccountName('');
                        setNewAccountColor(ACCOUNT_COLORS[0]);
                      }}
                      className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-2 p-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un compte
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}