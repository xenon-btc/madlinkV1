import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { useAccountSync } from '../hooks/useAccountSync';
import type { Expense } from '../types';

const EXPENSE_CATEGORIES = [
  'Carburant',
  'Assurance',
  'Outils & Matériel',
  'Entretien véhicule',
  'Fournitures de bureau',
  'Télécommunications',
  'Formation',
  'Autre'
] as const;

type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export function Expenses() {
  const [searchParams] = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { getCurrentAccount, setCurrentAccount, accounts } = useAccountsStore();
  const [newExpense, setNewExpense] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: '' as ExpenseCategory,
    description: ''
  });

  const fetchExpenses = async () => {
    if (!user) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
      setLoading(true);
      setError(null);
      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('userId', '==', user.uid),
        where('accountId', '==', currentAccount.id),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedExpenses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        date: doc.data().date.toDate(),
        amount: doc.data().amount,
        category: doc.data().category,
        description: doc.data().description
      }));

      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error('Erreur lors de la récupération des dépenses:', error);
      setError('Erreur lors de la récupération des dépenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const accountParam = searchParams.get('account');
    if (accountParam && accounts.length > 0) {
      const targetAccount = accounts.find(acc => acc.id === accountParam);
      if (targetAccount) {
        setCurrentAccount(targetAccount.id);
      }
    }
  }, [searchParams, accounts, setCurrentAccount]);

  const refreshData = useCallback(() => {
    fetchExpenses();
  }, [user?.uid]);

  useEffect(() => {
    refreshData();
  }, [user]);

  useAccountSync(refreshData);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !newExpense.amount) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
      setError(null);
      const expenseData = {
        date: new Date(newExpense.date),
        amount: Number(newExpense.amount),
        category: newExpense.category || null,
        description: newExpense.description || null,
        userId: user.uid,
        accountId: currentAccount.id,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'expenses'), expenseData);

      setNewExpense({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        category: '' as ExpenseCategory,
        description: ''
      });
      setIsAdding(false);
      await fetchExpenses();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la dépense:', error);
      setError('Erreur lors de l\'ajout de la dépense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      try {
        setError(null);
        const expenseRef = doc(db, 'expenses', id);
        await deleteDoc(expenseRef);
        await fetchExpenses();
      } catch (error) {
        console.error('Erreur lors de la suppression de la dépense:', error);
        setError('Erreur lors de la suppression de la dépense');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dépenses</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Nouvelle dépense
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Montant (€)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Catégorie (optionnel)
                </label>
                <select
                  id="category"
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as ExpenseCategory })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {EXPENSE_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Description (optionnel)
                </label>
                <textarea
                  id="description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {format(expense.date, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {expense.category || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {expense.amount.toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucune dépense enregistrée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}