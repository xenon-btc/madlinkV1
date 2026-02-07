import React, { useEffect, useState, useCallback } from 'react';
import { Activity, FileText, TrendingUp, Wallet, Plus, Receipt, Building2, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { DashboardCard } from '../components/DashboardCard';
import { RevenueTimeSlider } from '../components/RevenueTimeSlider';
import { MonthlyRevenueByAccount } from '../components/MonthlyRevenueByAccount';
import { AccountsComparisonTable } from '../components/AccountsComparisonTable';
import { RevenueByTypeSlides } from '../components/RevenueByTypeSlides';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { useAccountSync } from '../hooks/useAccountSync';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AccountStats {
  accountId: string;
  accountName: string;
  accountColor: string;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  monthlyExpenses: number;
  monthlyInterventions: number;
  totalInterventions: number;
}

export function Dashboard() {
  const { user } = useAuthStore();
  const { accounts } = useAccountsStore();
  const [activeTab, setActiveTab] = useState<'general' | string>('general');
  const [globalStats, setGlobalStats] = useState({
    totalInterventions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyExpenses: 0,
    monthlyInterventions: 0
  });
  const [accountsStats, setAccountsStats] = useState<AccountStats[]>([]);
  const [currentAccountStats, setCurrentAccountStats] = useState({
    totalInterventions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyExpenses: 0,
    monthlyInterventions: 0
  });
  const [monthlyChartData, setMonthlyChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(() => {
    if (user?.uid && accounts.length > 0) {
      fetchAllStats();
    }
  }, [user?.uid, accounts.length]);

  useEffect(() => {
    refreshData();
  }, [user, accounts]);

  useAccountSync(refreshData);

  useEffect(() => {
    if (activeTab !== 'general') {
      const accountStats = accountsStats.find(acc => acc.accountId === activeTab);
      if (accountStats) {
        setCurrentAccountStats({
          totalInterventions: accountStats.totalInterventions,
          totalRevenue: accountStats.totalRevenue,
          monthlyRevenue: accountStats.monthlyRevenue,
          dailyRevenue: accountStats.dailyRevenue,
          weeklyRevenue: accountStats.weeklyRevenue,
          monthlyExpenses: accountStats.monthlyExpenses,
          monthlyInterventions: accountStats.monthlyInterventions
        });
        generateAccountChartData(activeTab);
      }
    } else {
      generateGlobalChartData();
    }
  }, [activeTab, accountsStats]);

  const fetchAllStats = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
      const startOfThisMonth = startOfMonth(now);
      const endOfThisMonth = endOfMonth(now);

      let globalTotalRevenue = 0;
      let globalMonthlyRevenue = 0;
      let globalWeeklyRevenue = 0;
      let globalDailyRevenue = 0;
      let globalMonthlyExpenses = 0;
      let globalMonthlyInterventions = 0;
      let globalTotalInterventions = 0;

      const accountsStatsData: AccountStats[] = [];

      // Récupérer les stats pour chaque compte
      for (const account of accounts) {
        // Interventions pour ce compte
        const interventionsRef = collection(db, 'interventions');
        const interventionsQuery = query(
          interventionsRef,
          where('userId', '==', user.uid),
          where('accountId', '==', account.id)
        );
        const interventionsSnapshot = await getDocs(interventionsQuery);

        let accountTotalRevenue = 0;
        let accountMonthlyRevenue = 0;
        let accountWeeklyRevenue = 0;
        let accountDailyRevenue = 0;
        let accountMonthlyInterventions = 0;
        let accountTotalInterventions = 0;

        interventionsSnapshot.forEach((doc) => {
          const intervention = doc.data();
          if (intervention.date && intervention.totalPrice) {
            const interventionDate = intervention.date.toDate();
            const price = intervention.totalPrice || 0;

            accountTotalInterventions++;
            accountTotalRevenue += price;

            if (interventionDate >= startOfThisMonth && interventionDate <= endOfThisMonth) {
              accountMonthlyRevenue += price;
              accountMonthlyInterventions++;
            }

            if (interventionDate >= startOfThisWeek) {
              accountWeeklyRevenue += price;
            }

            if (interventionDate >= startOfToday) {
              accountDailyRevenue += price;
            }
          }
        });

        // Dépenses pour ce compte
        const expensesRef = collection(db, 'expenses');
        const expensesQuery = query(
          expensesRef,
          where('userId', '==', user.uid),
          where('accountId', '==', account.id),
          where('date', '>=', Timestamp.fromDate(startOfThisMonth)),
          where('date', '<=', Timestamp.fromDate(endOfThisMonth))
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        
        let accountMonthlyExpenses = 0;
        expensesSnapshot.forEach((doc) => {
          const expense = doc.data();
          if (expense.amount) {
            accountMonthlyExpenses += expense.amount;
          }
        });

        const accountStats: AccountStats = {
          accountId: account.id,
          accountName: account.name,
          accountColor: account.color,
          totalRevenue: accountTotalRevenue,
          monthlyRevenue: accountMonthlyRevenue,
          weeklyRevenue: accountWeeklyRevenue,
          dailyRevenue: accountDailyRevenue,
          monthlyExpenses: accountMonthlyExpenses,
          monthlyInterventions: accountMonthlyInterventions,
          totalInterventions: accountTotalInterventions
        };

        accountsStatsData.push(accountStats);

        // Ajouter aux stats globales
        globalTotalRevenue += accountTotalRevenue;
        globalMonthlyRevenue += accountMonthlyRevenue;
        globalWeeklyRevenue += accountWeeklyRevenue;
        globalDailyRevenue += accountDailyRevenue;
        globalMonthlyExpenses += accountMonthlyExpenses;
        globalMonthlyInterventions += accountMonthlyInterventions;
        globalTotalInterventions += accountTotalInterventions;
      }

      setGlobalStats({
        totalRevenue: globalTotalRevenue,
        monthlyRevenue: globalMonthlyRevenue,
        weeklyRevenue: globalWeeklyRevenue,
        dailyRevenue: globalDailyRevenue,
        monthlyExpenses: globalMonthlyExpenses,
        monthlyInterventions: globalMonthlyInterventions,
        totalInterventions: globalTotalInterventions
      });

      setAccountsStats(accountsStatsData);

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateGlobalChartData = async () => {
    if (!user?.uid) return;

    try {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 5);
      const months = eachMonthOfInterval({
        start: startOfMonth(sixMonthsAgo),
        end: endOfMonth(now)
      });

      const monthlyData: { [key: string]: number } = {};
      months.forEach(month => {
        monthlyData[format(month, 'yyyy-MM')] = 0;
      });

      // Récupérer toutes les interventions de tous les comptes
      const interventionsRef = collection(db, 'interventions');
      const q = query(
        interventionsRef,
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfMonth(sixMonthsAgo)))
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const intervention = doc.data();
        if (intervention.date && intervention.totalPrice) {
          const date = intervention.date.toDate();
          const price = intervention.totalPrice || 0;
          const monthKey = format(date, 'yyyy-MM');
          
          if (monthlyData.hasOwnProperty(monthKey)) {
            monthlyData[monthKey] += price;
          }
        }
      });

      setMonthlyChartData({
        labels: months.map(month => format(month, 'MMM yyyy', { locale: fr })),
        datasets: [{
          label: 'CA Mensuel Global',
          data: Object.values(monthlyData),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        }]
      });

    } catch (error) {
      console.error('Erreur lors de la génération des graphiques globaux:', error);
    }
  };

  const generateAccountChartData = async (accountId: string) => {
    if (!user?.uid) return;

    try {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 5);
      const months = eachMonthOfInterval({
        start: startOfMonth(sixMonthsAgo),
        end: endOfMonth(now)
      });

      const monthlyData: { [key: string]: number } = {};
      months.forEach(month => {
        monthlyData[format(month, 'yyyy-MM')] = 0;
      });

      const account = accounts.find(acc => acc.id === accountId);
      
      // Récupérer les interventions pour ce compte spécifique
      const interventionsRef = collection(db, 'interventions');
      const q = query(
        interventionsRef,
        where('userId', '==', user.uid),
        where('accountId', '==', accountId),
        where('date', '>=', Timestamp.fromDate(startOfMonth(sixMonthsAgo)))
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const intervention = doc.data();
        if (intervention.date && intervention.totalPrice) {
          const date = intervention.date.toDate();
          const price = intervention.totalPrice || 0;
          const monthKey = format(date, 'yyyy-MM');
          
          if (monthlyData.hasOwnProperty(monthKey)) {
            monthlyData[monthKey] += price;
          }
        }
      });

      setMonthlyChartData({
        labels: months.map(month => format(month, 'MMM yyyy', { locale: fr })),
        datasets: [{
          label: `CA Mensuel - ${account?.name}`,
          data: Object.values(monthlyData),
          backgroundColor: account?.color + '80',
          borderColor: account?.color,
          borderWidth: 1,
        }]
      });

    } catch (error) {
      console.error('Erreur lors de la génération des graphiques du compte:', error);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#374151' : '#e5e7eb';
          },
        },
        ticks: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#e5e7eb' : '#374151';
          },
        },
      },
      y: {
        grid: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#374151' : '#e5e7eb';
          },
        },
        ticks: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#e5e7eb' : '#374151';
          },
          callback: function(value: any) {
            return value + ' €';
          }
        },
        beginAtZero: true,
      },
    },
  };

  const currentStats = activeTab === 'general' ? globalStats : currentAccountStats;
  const currentAccount = activeTab !== 'general' ? accounts.find(acc => acc.id === activeTab) : null;

  return (
    <div>
      {/* Logo visible en haut sur mobile */}
      <div className="lg:hidden mb-6 pt-2">
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-200">
          Mad<span className="text-blue-600 dark:text-blue-400">lin</span>K
        </h1>
      </div>

      {/* Onglets */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Général
              </div>
            </button>
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => setActiveTab(account.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === account.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                  {account.name}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* En-tête avec titre du compte actuel */}
          {activeTab !== 'general' && currentAccount && (
            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div 
                className="p-4 text-white"
                style={{ backgroundColor: currentAccount.color }}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6" />
                  <div>
                    <h2 className="text-xl font-bold">{currentAccount.name}</h2>
                    <p className="text-sm opacity-90">Statistiques détaillées pour ce compte</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Titre principal */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {activeTab === 'general' ? 'Tableau de bord général' : `Tableau de bord - ${currentAccount?.name}`}
          </h1>
          
          {/* Boutons d'action rapide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Link
              to={activeTab !== 'general' ? `/dashboard/interventions?account=${activeTab}` : '/dashboard/interventions'}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvelle intervention
            </Link>
            <Link
              to={activeTab !== 'general' ? `/dashboard/expenses?account=${activeTab}` : '/dashboard/expenses'}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvelle dépense
            </Link>
          </div>
          
          {/* Cartes de statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <DashboardCard
              title="CA du jour"
              value={`${currentStats.dailyRevenue.toLocaleString('fr-FR')} €`}
              icon={FileText}
            />
            <DashboardCard
              title="CA de la semaine"
              value={`${currentStats.weeklyRevenue.toLocaleString('fr-FR')} €`}
              icon={TrendingUp}
            />
            <DashboardCard
              title="CA du mois"
              value={`${currentStats.monthlyRevenue.toLocaleString('fr-FR')} €`}
              icon={TrendingUp}
            />
            <DashboardCard
              title="Dépenses du mois"
              value={`${currentStats.monthlyExpenses.toLocaleString('fr-FR')} €`}
              icon={Receipt}
            />
            <DashboardCard
              title="Chiffre d'affaires total"
              value={`${currentStats.totalRevenue.toLocaleString('fr-FR')} €`}
              icon={Wallet}
            />
            <DashboardCard
              title="Interventions du mois"
              value={currentStats.monthlyInterventions.toString()}
              icon={Activity}
            />
          </div>

          {/* Graphiques */}
          {/* Graphiques supplémentaires pour la vue générale */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              {/* Graphique camembert avec slides */}
              <div className="h-[500px]">
                <RevenueTimeSlider />
              </div>
              
              {/* Graphique en colonnes par opérateur */}
              <div className="h-[400px]">
                <MonthlyRevenueByAccount />
              </div>
              
              {/* Tableau comparatif */}
              <div>
                <AccountsComparisonTable />
              </div>
            </div>
          )}

          {/* Graphiques pour les onglets individuels des comptes */}
          {activeTab !== 'general' && monthlyChartData && (
            <div className="space-y-8">
              {/* Graphique mensuel pour le compte */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-[400px]">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Évolution mensuelle - {currentAccount?.name}
                </h3>
                <div className="h-[320px]">
                  <Bar data={monthlyChartData} options={chartOptions} />
                </div>
              </div>
              
              {/* Graphique camembert pour le compte */}
              <div className="h-[500px]">
                <RevenueTimeSlider />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}