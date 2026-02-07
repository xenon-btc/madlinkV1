import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { format, startOfDay, endOfDay, eachDayOfInterval, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

const options = {
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
        maxTicksLimit: 10,
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
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  elements: {
    point: {
      radius: 4,
      hoverRadius: 6,
    },
    line: {
      tension: 0.3,
    },
  },
};

export function DailyRevenueChart() {
  const { user } = useAuthStore();
  const { getCurrentAccount } = useAccountsStore();
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
      pointBackgroundColor: string;
      pointBorderColor: string;
    }[];
  }>({
    labels: [],
    datasets: [{
      data: [],
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      pointBorderColor: '#ffffff',
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      const currentAccount = getCurrentAccount();
      if (!currentAccount) return;

      try {
        const now = new Date();
        const thirtyDaysAgo = subDays(now, 29); // 30 jours au total
        const startDate = startOfDay(thirtyDaysAgo);
        const endDate = endOfDay(now);
        
        const days = eachDayOfInterval({
          start: startDate,
          end: endDate
        });

        const interventionsRef = collection(db, 'interventions');
        const q = query(
          interventionsRef,
          where('userId', '==', user.uid),
          where('accountId', '==', currentAccount.id),
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
        );
        
        const querySnapshot = await getDocs(q);

        const dailyRevenue = new Map(
          days.map(day => [format(day, 'yyyy-MM-dd'), 0])
        );

        querySnapshot.forEach((doc) => {
          const intervention = doc.data();
          if (intervention.date && intervention.totalPrice) {
            const date = intervention.date.toDate();
            const dayKey = format(date, 'yyyy-MM-dd');
            
            if (dailyRevenue.has(dayKey)) {
              dailyRevenue.set(
                dayKey,
                (dailyRevenue.get(dayKey) || 0) + (intervention.totalPrice || 0)
              );
            }
          }
        });

        setChartData({
          labels: Array.from(dailyRevenue.keys()).map(dayKey => 
            format(new Date(dayKey), 'dd/MM', { locale: fr })
          ),
          datasets: [{
            data: Array.from(dailyRevenue.values()),
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
            pointBorderColor: '#ffffff',
          }]
        });

      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      }
    };

    fetchData();
  }, [user]);

  return <Line options={options} data={chartData} />;
}