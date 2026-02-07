import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut } from 'react-chartjs-2';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';

ChartJS.register(ArcElement, Tooltip, ChartDataLabels);

const generateColors = (count: number) => {
  const colors = [
    ['rgba(59, 130, 246, 0.8)', 'rgba(37, 99, 235, 0.8)'],   // Blue
    ['rgba(239, 68, 68, 0.8)', 'rgba(220, 38, 38, 0.8)'],    // Red
    ['rgba(34, 197, 94, 0.8)', 'rgba(22, 163, 74, 0.8)'],    // Green
    ['rgba(245, 158, 11, 0.8)', 'rgba(217, 119, 6, 0.8)'],   // Orange
    ['rgba(147, 51, 234, 0.8)', 'rgba(126, 34, 206, 0.8)'],  // Purple
    ['rgba(14, 165, 233, 0.8)', 'rgba(2, 132, 199, 0.8)'],   // Light Blue
    ['rgba(168, 85, 247, 0.8)', 'rgba(147, 51, 234, 0.8)'],  // Light Purple
    ['rgba(16, 185, 129, 0.8)', 'rgba(5, 150, 105, 0.8)'],   // Emerald
  ];

  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};

export function RevenueByTypeChart() {
  const { user } = useAuthStore();
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
      hoverBackgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
      offset: number[];
    }[];
  }>({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      hoverBackgroundColor: [],
      borderColor: [],
      borderWidth: 1,
      offset: []
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const interventionsRef = collection(db, 'interventions');
        const q = query(interventionsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        const revenueByType = new Map<string, number>();
        let totalRevenue = 0;

        querySnapshot.forEach((doc) => {
          const intervention = doc.data();
          if (intervention.selectedTypes) {
            intervention.selectedTypes.forEach((type: { name: string; price: number }) => {
              const currentRevenue = revenueByType.get(type.name) || 0;
              revenueByType.set(type.name, currentRevenue + type.price);
              totalRevenue += type.price;
            });
          }
        });

        const sortedTypes = Array.from(revenueByType.entries())
          .sort((a, b) => b[1] - a[1]);

        const labels = sortedTypes.map(([name]) => name);
        const data = sortedTypes.map(([, revenue]) => revenue);
        const colorPairs = generateColors(labels.length);
        const backgroundColors = colorPairs.map(pair => pair[0]);
        const hoverColors = colorPairs.map(pair => pair[1]);
        
        const offset = data.map((_, index) => index * 4);

        setChartData({
          labels,
          datasets: [{
            data,
            backgroundColor: backgroundColors,
            hoverBackgroundColor: hoverColors,
            borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
            borderWidth: 1,
            offset
          }]
        });

      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      }
    };

    fetchData();
  }, [user]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        color: '#fff',
        font: {
          weight: 'bold',
          size: 12
        },
        formatter: (value: number, context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${percentage}%`;
        }
      },
      title: {
        display: true,
        text: 'CA par article',
        color: (context: any) => {
          const isDarkMode = document.documentElement.classList.contains('dark');
          return isDarkMode ? '#e5e7eb' : '#374151';
        },
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.raw;
            const total = context.dataset.data.reduce((sum: number, value: number) => sum + value, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString('fr-FR')}€ (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
    rotation: -0.5 * Math.PI,
    radius: '90%'
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm h-[400px]">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}