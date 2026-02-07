import React, { useEffect, useState } from 'react';
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
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function MonthlyRevenueByAccount() {
  const { user } = useAuthStore();
  const { accounts } = useAccountsStore();
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid || accounts.length === 0) return;

      try {
        setLoading(true);
        
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 5);
        const months = eachMonthOfInterval({
          start: startOfMonth(sixMonthsAgo),
          end: endOfMonth(now)
        });

        // Préparer les données pour chaque compte
        const accountsData: { [accountId: string]: { [monthKey: string]: number } } = {};
        
        accounts.forEach(account => {
          accountsData[account.id] = {};
          months.forEach(month => {
            accountsData[account.id][format(month, 'yyyy-MM')] = 0;
          });
        });

        // Récupérer toutes les interventions
        const interventionsRef = collection(db, 'interventions');
        const q = query(
          interventionsRef,
          where('userId', '==', user.uid),
          where('date', '>=', Timestamp.fromDate(startOfMonth(sixMonthsAgo)))
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          const intervention = doc.data();
          if (intervention.date && intervention.totalPrice && intervention.accountId) {
            const date = intervention.date.toDate();
            const monthKey = format(date, 'yyyy-MM');
            const accountId = intervention.accountId;
            
            if (accountsData[accountId] && accountsData[accountId].hasOwnProperty(monthKey)) {
              accountsData[accountId][monthKey] += intervention.totalPrice;
            }
          }
        });

        // Créer les datasets pour le graphique
        const datasets = accounts.map(account => ({
          label: account.name,
          data: Object.values(accountsData[account.id]),
          backgroundColor: account.color + '80',
          borderColor: account.color,
          borderWidth: 1,
        }));

        setChartData({
          labels: months.map(month => format(month, 'MMM yyyy', { locale: fr })),
          datasets
        });

      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, accounts]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: (context: any) => {
            const isDarkMode = document.documentElement.classList.contains('dark');
            return isDarkMode ? '#e5e7eb' : '#374151';
          },
        }
      },
      title: {
        display: true,
        text: 'CA mensuel par opérateur',
        color: (context: any) => {
          const isDarkMode = document.documentElement.classList.contains('dark');
          return isDarkMode ? '#e5e7eb' : '#374151';
        },
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.raw.toLocaleString('fr-FR')}€`;
          }
        }
      }
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
            return value + '€';
          }
        },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-[400px]">
      {chartData && <Bar data={chartData} options={chartOptions} />}
    </div>
  );
}