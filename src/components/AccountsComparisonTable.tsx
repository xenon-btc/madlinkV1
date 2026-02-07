import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, Receipt, Calculator } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

interface AccountStats {
  accountId: string;
  accountName: string;
  accountColor: string;
  dailyRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
  monthlyExpenses: number;
  monthlyInterventions: number;
  netResult: number;
}

export function AccountsComparisonTable() {
  const { user } = useAuthStore();
  const { accounts } = useAccountsStore();
  const [accountsStats, setAccountsStats] = useState<AccountStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountsStats = async () => {
      if (!user?.uid || accounts.length === 0) return;

      try {
        setLoading(true);
        
        const now = new Date();
        const startToday = startOfDay(now);
        const startWeek = startOfWeek(now, { weekStartsOn: 1 });
        const startMonth = startOfMonth(now);
        const endMonth = endOfMonth(now);

        const accountsStatsData: AccountStats[] = [];

        for (const account of accounts) {
          // Récupérer les interventions pour ce compte
          const interventionsRef = collection(db, 'interventions');
          const interventionsQuery = query(
            interventionsRef,
            where('userId', '==', user.uid),
            where('accountId', '==', account.id)
          );
          const interventionsSnapshot = await getDocs(interventionsQuery);

          let totalRevenue = 0;
          let monthlyRevenue = 0;
          let weeklyRevenue = 0;
          let dailyRevenue = 0;
          let monthlyInterventions = 0;

          interventionsSnapshot.forEach((doc) => {
            const intervention = doc.data();
            if (intervention.date && intervention.totalPrice) {
              const interventionDate = intervention.date.toDate();
              const price = intervention.totalPrice || 0;

              totalRevenue += price;

              if (interventionDate >= startMonth && interventionDate <= endMonth) {
                monthlyRevenue += price;
                monthlyInterventions++;
              }

              if (interventionDate >= startWeek) {
                weeklyRevenue += price;
              }

              if (interventionDate >= startToday) {
                dailyRevenue += price;
              }
            }
          });

          // Récupérer les dépenses pour ce compte
          const expensesRef = collection(db, 'expenses');
          const expensesQuery = query(
            expensesRef,
            where('userId', '==', user.uid),
            where('accountId', '==', account.id),
            where('date', '>=', Timestamp.fromDate(startMonth)),
            where('date', '<=', Timestamp.fromDate(endMonth))
          );
          const expensesSnapshot = await getDocs(expensesQuery);
          
          let monthlyExpenses = 0;
          expensesSnapshot.forEach((doc) => {
            const expense = doc.data();
            if (expense.amount) {
              monthlyExpenses += expense.amount;
            }
          });

          const netResult = monthlyRevenue - monthlyExpenses;

          accountsStatsData.push({
            accountId: account.id,
            accountName: account.name,
            accountColor: account.color,
            dailyRevenue,
            weeklyRevenue,
            monthlyRevenue,
            totalRevenue,
            monthlyExpenses,
            monthlyInterventions,
            netResult
          });
        }

        // Trier par CA mensuel décroissant
        accountsStatsData.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
        setAccountsStats(accountsStatsData);

      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountsStats();
  }, [user, accounts]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (accountsStats.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Comparaison par compte
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Aucune donnée disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Comparaison par compte
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Performance de chaque opérateur ce mois-ci
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Compte
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CA Jour
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CA Semaine
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CA Mois
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                CA Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Dépenses
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Résultat Net
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Interventions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {accountsStats.map((account, index) => (
              <tr key={account.accountId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: account.accountColor }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {account.accountName}
                    </span>
                    {index === 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                        🏆 Top
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {account.dailyRevenue.toLocaleString('fr-FR')} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {account.weeklyRevenue.toLocaleString('fr-FR')} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  <div className="flex items-center justify-end gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    {account.monthlyRevenue.toLocaleString('fr-FR')} €
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {account.totalRevenue.toLocaleString('fr-FR')} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400">
                  <div className="flex items-center justify-end gap-2">
                    <Receipt className="w-4 h-4" />
                    {account.monthlyExpenses.toLocaleString('fr-FR')} €
                  </div>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                  account.netResult >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  <div className="flex items-center justify-end gap-2">
                    <Calculator className="w-4 h-4" />
                    {account.netResult.toLocaleString('fr-FR')} €
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {account.monthlyInterventions}
                </td>
              </tr>
            ))}
            
            {/* Ligne de total */}
            <tr className="bg-gray-50 dark:bg-gray-900 font-medium">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                  <span className="font-semibold">TOTAL</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                {accountsStats.reduce((sum, acc) => sum + acc.dailyRevenue, 0).toLocaleString('fr-FR')} €
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                {accountsStats.reduce((sum, acc) => sum + acc.weeklyRevenue, 0).toLocaleString('fr-FR')} €
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                {accountsStats.reduce((sum, acc) => sum + acc.monthlyRevenue, 0).toLocaleString('fr-FR')} €
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                {accountsStats.reduce((sum, acc) => sum + acc.totalRevenue, 0).toLocaleString('fr-FR')} €
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400">
                {accountsStats.reduce((sum, acc) => sum + acc.monthlyExpenses, 0).toLocaleString('fr-FR')} €
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${
                accountsStats.reduce((sum, acc) => sum + acc.netResult, 0) >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {accountsStats.reduce((sum, acc) => sum + acc.netResult, 0).toLocaleString('fr-FR')} €
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                {accountsStats.reduce((sum, acc) => sum + acc.monthlyInterventions, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}