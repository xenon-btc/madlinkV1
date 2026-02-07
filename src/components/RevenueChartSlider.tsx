import React, { useState } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { WeeklyRevenueChart } from './WeeklyRevenueChart';
import { DailyRevenueChart } from './DailyRevenueChart';

export function RevenueChartSlider() {
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm h-full">
      {/* Toggle Switch */}
      <div className="flex items-center justify-center mb-4">
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
          <button
            onClick={() => setViewMode('weekly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'weekly'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Par semaine
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'daily'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Par jour
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-[350px]">
        {viewMode === 'weekly' ? <WeeklyRevenueChart /> : <DailyRevenueChart />}
      </div>
    </div>
  );
}