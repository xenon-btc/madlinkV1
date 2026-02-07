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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
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

const generateGradient = (ctx: CanvasRenderingContext2D, height: number) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(147, 51, 234, 0.8)');  // Purple
  gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.8)'); // Blue
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)');   // Green
  return gradient;
};

export function WeeklyRevenueChart() {
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
      if (!user) return;

      const currentAccount = getCurrentAccount();
      if (!currentAccount) return;

      try {
        const now = new Date();
        const fourWeeksAgo = subWeeks(now, 3);
        const weeks = eachWeekOfInterval(
          {
            start: startOfWeek(fourWeeksAgo, { weekStartsOn: 1 }),
            end: endOfWeek(now, { weekStartsOn: 1 })
          },
          { weekStartsOn: 1 }
        );

        const interventionsRef = collection(db, 'interventions');
        const q = query(
          interventionsRef,
          where('accountId', '==', currentAccount.id),
          where('userId', '==', user.uid),
          where('date', '>=', startOfWeek(fourWeeksAgo, { weekStartsOn: 1 }))
        );
        const querySnapshot = await getDocs(q);

        const weeklyRevenue = new Map(
          weeks.map(week => [format(week, 'yyyy-ww'), 0])
        );

        querySnapshot.forEach((doc) => {
          const intervention = doc.data();
          const date = intervention.date.toDate();
          const weekKey = format(date, 'yyyy-ww');
          const price = intervention.totalPrice || 0;
          
          weeklyRevenue.set(
            weekKey,
            (weeklyRevenue.get(weekKey) || 0) + price
          );
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const gradient = ctx ? generateGradient(ctx, 400) : 'rgba(59, 130, 246, 0.8)';

        setChartData({
          labels: Array.from(weeklyRevenue.keys()).map(weekKey => {
            const [year, week] = weekKey.split('-');
            const weekDate = startOfWeek(new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7), { weekStartsOn: 1 });
            return `Sem. ${format(weekDate, 'dd/MM', { locale: fr })}`;
          }),
          datasets: [{
            data: Array.from(weeklyRevenue.values()),
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

  return <Bar options={options} data={chartData} />;
}