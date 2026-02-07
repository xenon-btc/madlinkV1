import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
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
);

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: 'CA par mois',
      color: (context: any) => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        return isDarkMode ? '#e5e7eb' : '#374151';
      },
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

const generateGradient = (ctx: CanvasRenderingContext2D, height: number) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(147, 51, 234, 0.8)');  // Purple
  gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.8)'); // Blue
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)');   // Green
  return gradient;
};

export function RevenueChart() {
  const { user } = useAuthStore();
  const { getCurrentAccount } = useAccountsStore();
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string | CanvasGradient;
      borderColor: string;
      borderWidth: number;
    }[];
  }>({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'transparent',
      borderWidth: 1
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      const currentAccount = getCurrentAccount();
      if (!currentAccount) return;

      try {
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 5);
        const startDate = startOfMonth(sixMonthsAgo);
        
        const months = eachMonthOfInterval({
          start: startDate,
          end: endOfMonth(now)
        });

        const interventionsRef = collection(db, 'interventions');
        const q = query(
          interventionsRef,
          where('accountId', '==', currentAccount.id),
          where('userId', '==', user.uid),
          where('date', '>=', Timestamp.fromDate(startDate))
        );
        
        const querySnapshot = await getDocs(q);

        const monthlyRevenue = new Map(
          months.map(month => [format(month, 'yyyy-MM'), 0])
        );

        querySnapshot.forEach((doc) => {
          const intervention = doc.data();
          if (intervention.date && intervention.totalPrice) {
            const date = intervention.date.toDate();
            const monthKey = format(date, 'yyyy-MM');
            
            if (monthlyRevenue.has(monthKey)) {
              monthlyRevenue.set(
                monthKey,
                (monthlyRevenue.get(monthKey) || 0) + (intervention.totalPrice || 0)
              );
            }
          }
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const gradient = ctx ? generateGradient(ctx, 400) : 'rgba(59, 130, 246, 0.8)';

        setChartData({
          labels: Array.from(monthlyRevenue.keys()).map(monthKey => 
            format(new Date(monthKey), 'MMMM yyyy', { locale: fr })
          ),
          datasets: [{
            data: Array.from(monthlyRevenue.values()),
            backgroundColor: gradient,
            borderColor: 'transparent',
            borderWidth: 1
          }]
        });

      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm h-full">
      <Bar options={options} data={chartData} />
    </div>
  );
}