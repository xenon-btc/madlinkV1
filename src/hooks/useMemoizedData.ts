import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, format } from 'date-fns';

// Memoization des calculs de statistiques
export function useMemoizedStats(interventions: any[], expenses: any[]) {
  return useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let weeklyRevenue = 0;
    let dailyRevenue = 0;
    let totalInterventions = 0;
    let monthlyInterventions = 0;

    interventions.forEach((intervention) => {
      if (intervention.date && intervention.totalPrice) {
        const date = intervention.date.toDate ? intervention.date.toDate() : new Date(intervention.date);
        const price = intervention.totalPrice || 0;

        totalInterventions++;
        totalRevenue += price;

        if (date >= startOfThisMonth && date <= endOfThisMonth) {
          monthlyRevenue += price;
          monthlyInterventions++;
        }

        if (date >= startOfThisWeek) {
          weeklyRevenue += price;
        }

        if (date >= startOfToday) {
          dailyRevenue += price;
        }
      }
    });

    let monthlyExpenses = 0;
    expenses.forEach((expense) => {
      if (expense.date && expense.amount) {
        const date = expense.date.toDate ? expense.date.toDate() : new Date(expense.date);
        if (date >= startOfThisMonth && date <= endOfThisMonth) {
          monthlyExpenses += expense.amount;
        }
      }
    });

    return {
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      dailyRevenue,
      totalInterventions,
      monthlyInterventions,
      monthlyExpenses,
      netProfit: monthlyRevenue - monthlyExpenses
    };
  }, [interventions, expenses]);
}

// Memoization des données groupées par type
export function useMemoizedRevenueByType(interventions: any[]) {
  return useMemo(() => {
    const revenueByType: Record<string, number> = {};
    const countByType: Record<string, number> = {};

    interventions.forEach((intervention) => {
      if (intervention.selectedTypes && Array.isArray(intervention.selectedTypes)) {
        intervention.selectedTypes.forEach((type: any) => {
          const typeName = type.name || 'Sans type';
          const price = type.price || 0;

          if (!revenueByType[typeName]) {
            revenueByType[typeName] = 0;
            countByType[typeName] = 0;
          }

          revenueByType[typeName] += price;
          countByType[typeName]++;
        });
      }
    });

    return {
      revenueByType,
      countByType,
      types: Object.keys(revenueByType).sort((a, b) => revenueByType[b] - revenueByType[a])
    };
  }, [interventions]);
}

// Memoization des données mensuelles pour graphiques
export function useMemoizedMonthlyData(interventions: any[], months: number = 6) {
  return useMemo(() => {
    const now = new Date();
    const monthlyData: Record<string, number> = {};

    // Initialiser les mois
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(date, 'yyyy-MM');
      monthlyData[key] = 0;
    }

    // Remplir avec les données
    interventions.forEach((intervention) => {
      if (intervention.date && intervention.totalPrice) {
        const date = intervention.date.toDate ? intervention.date.toDate() : new Date(intervention.date);
        const key = format(date, 'yyyy-MM');

        if (monthlyData.hasOwnProperty(key)) {
          monthlyData[key] += intervention.totalPrice || 0;
        }
      }
    });

    return {
      labels: Object.keys(monthlyData),
      values: Object.values(monthlyData),
      data: monthlyData
    };
  }, [interventions, months]);
}

// Memoization des données groupées par compte
export function useMemoizedAccountData(interventions: any[], expenses: any[], accounts: any[]) {
  return useMemo(() => {
    const accountStats = accounts.map(account => {
      const accountInterventions = interventions.filter(
        (i: any) => i.accountId === account.id
      );
      const accountExpenses = expenses.filter(
        (e: any) => e.accountId === account.id
      );

      const totalRevenue = accountInterventions.reduce(
        (sum: number, i: any) => sum + (i.totalPrice || 0),
        0
      );
      const totalExpenses = accountExpenses.reduce(
        (sum: number, e: any) => sum + (e.amount || 0),
        0
      );

      return {
        accountId: account.id,
        accountName: account.name,
        accountColor: account.color,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        interventionsCount: accountInterventions.length,
        expensesCount: accountExpenses.length
      };
    });

    return {
      accountStats,
      totalRevenue: accountStats.reduce((sum, a) => sum + a.totalRevenue, 0),
      totalExpenses: accountStats.reduce((sum, a) => sum + a.totalExpenses, 0),
      totalProfit: accountStats.reduce((sum, a) => sum + a.netProfit, 0)
    };
  }, [interventions, expenses, accounts]);
}

// Memoization des données filtrées
export function useMemoizedFilteredData<T>(
  data: T[],
  filters: Record<string, any>
) {
  return useMemo(() => {
    if (Object.keys(filters).length === 0) return data;

    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === null || value === undefined || value === '') return true;
        return (item as any)[key] === value;
      });
    });
  }, [data, filters]);
}

// Memoization des données triées
export function useMemoizedSortedData<T>(
  data: T[],
  sortKey: string,
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useMemo(() => {
    if (!sortKey) return data;

    const sorted = [...data].sort((a, b) => {
      const aValue = (a as any)[sortKey];
      const bValue = (b as any)[sortKey];

      if (aValue === bValue) return 0;

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return sorted;
  }, [data, sortKey, sortOrder]);
}

// Memoization des données paginées avec recherche
export function useMemoizedSearchAndPaginate<T>(
  data: T[],
  searchTerm: string,
  searchKeys: string[],
  page: number,
  pageSize: number
) {
  return useMemo(() => {
    // Recherche
    let filtered = data;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = data.filter(item => {
        return searchKeys.some(key => {
          const value = (item as any)[key];
          return value && String(value).toLowerCase().includes(term);
        });
      });
    }

    // Pagination
    const totalPages = Math.ceil(filtered.length / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = filtered.slice(start, end);

    return {
      data: paginatedData,
      total: filtered.length,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  }, [data, searchTerm, searchKeys, page, pageSize]);
}

// Hook pour memoizer des calculs complexes avec dépendances multiples
export function useComplexMemo<T>(
  factory: () => T,
  deps: any[]
): T {
  return useMemo(factory, deps);
}
