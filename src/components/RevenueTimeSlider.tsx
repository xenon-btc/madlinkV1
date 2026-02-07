import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Doughnut } from 'react-chartjs-2';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, BarChart3 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, eachDayOfInterval, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

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

interface RevenueData {
  labels: string[];
  data: number[];
  total: number;
}

export function RevenueTimeSlider() {
  const { user } = useAuthStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dailyData, setDailyData] = useState<RevenueData>({ labels: [], data: [], total: 0 });
  const [weeklyData, setWeeklyData] = useState<RevenueData>({ labels: [], data: [], total: 0 });
  const [monthlyData, setMonthlyData] = useState<RevenueData>({ labels: [], data: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const slides = [
    {
      title: 'CA Aujourd\'hui',
      subtitle: format(new Date(), 'dd MMMM yyyy', { locale: fr }),
      data: dailyData,
      icon: Calendar,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'CA Semaine',
      subtitle: `Semaine du ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd MMM', { locale: fr })}`,
      data: weeklyData,
      icon: CalendarDays,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'CA Mois',
      subtitle: format(new Date(), 'MMMM yyyy', { locale: fr }),
      data: monthlyData,
      icon: BarChart3,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const interventionsRef = collection(db, 'interventions');
        const q = query(interventionsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        const now = new Date();
        const startToday = startOfDay(now);
        const endToday = endOfDay(now);
        const startWeek = startOfWeek(now, { weekStartsOn: 1 });
        const endWeek = endOfWeek(now, { weekStartsOn: 1 });
        const startMonth = startOfMonth(now);
        const endMonth = endOfMonth(now);

        const dailyRevenue = new Map<string, number>();
        const weeklyRevenue = new Map<string, number>();
        const monthlyRevenue = new Map<string, number>();

        querySnapshot.forEach((doc) => {
          const intervention = doc.data();
          if (intervention.selectedTypes && intervention.date) {
            const interventionDate = intervention.date.toDate();
            
            intervention.selectedTypes.forEach((type: { name: string; price: number }) => {
              // Daily
              if (interventionDate >= startToday && interventionDate <= endToday) {
                const current = dailyRevenue.get(type.name) || 0;
                dailyRevenue.set(type.name, current + type.price);
              }

              // Weekly
              if (interventionDate >= startWeek && interventionDate <= endWeek) {
                const current = weeklyRevenue.get(type.name) || 0;
                weeklyRevenue.set(type.name, current + type.price);
              }

              // Monthly
              if (interventionDate >= startMonth && interventionDate <= endMonth) {
                const current = monthlyRevenue.get(type.name) || 0;
                monthlyRevenue.set(type.name, current + type.price);
              }
            });
          }
        });

        // Process daily data
        const sortedDaily = Array.from(dailyRevenue.entries()).sort((a, b) => b[1] - a[1]);
        const dailyTotal = sortedDaily.reduce((sum, [, revenue]) => sum + revenue, 0);
        setDailyData({
          labels: sortedDaily.map(([name]) => name),
          data: sortedDaily.map(([, revenue]) => revenue),
          total: dailyTotal
        });

        // Process weekly data
        const sortedWeekly = Array.from(weeklyRevenue.entries()).sort((a, b) => b[1] - a[1]);
        const weeklyTotal = sortedWeekly.reduce((sum, [, revenue]) => sum + revenue, 0);
        setWeeklyData({
          labels: sortedWeekly.map(([name]) => name),
          data: sortedWeekly.map(([, revenue]) => revenue),
          total: weeklyTotal
        });

        // Process monthly data
        const sortedMonthly = Array.from(monthlyRevenue.entries()).sort((a, b) => b[1] - a[1]);
        const monthlyTotal = sortedMonthly.reduce((sum, [, revenue]) => sum + revenue, 0);
        setMonthlyData({
          labels: sortedMonthly.map(([name]) => name),
          data: sortedMonthly.map(([, revenue]) => revenue),
          total: monthlyTotal
        });

      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const createChartData = (data: RevenueData) => {
    if (data.labels.length === 0) return null;

    const colorPairs = generateColors(data.labels.length);
    const backgroundColors = colorPairs.map(pair => pair[0]);
    const hoverColors = colorPairs.map(pair => pair[1]);

    return {
      labels: data.labels,
      datasets: [{
        data: data.data,
        backgroundColor: backgroundColors,
        hoverBackgroundColor: hoverColors,
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 2,
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        color: '#fff',
        font: {
          weight: 'bold' as const,
          size: 11
        },
        formatter: (value: number, context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return percentage > 5 ? `${percentage}%` : '';
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
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 h-[500px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];
  const chartData = createChartData(currentSlideData.data);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden h-[500px] relative">
      {/* Header avec gradient */}
      <div className={`bg-gradient-to-r ${currentSlideData.color} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <currentSlideData.icon className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">{currentSlideData.title}</h3>
              <p className="text-sm opacity-90">{currentSlideData.subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {currentSlideData.data.total.toLocaleString('fr-FR')}€
            </div>
            <div className="text-sm opacity-90">Total</div>
          </div>
        </div>
      </div>

      {/* Contenu du slide */}
      <div className="p-6 h-[380px] flex items-center justify-center">
        {chartData && currentSlideData.data.data.length > 0 ? (
          <div className="w-full h-full relative">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune donnée pour cette période</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-between px-6">
        <button
          onClick={prevSlide}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Indicateurs */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide
                  ? 'bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}