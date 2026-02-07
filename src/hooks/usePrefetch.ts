import { useEffect, useCallback, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCacheStore, generateCacheKey } from '../store/cache';

interface PrefetchConfig {
  collectionName: string;
  userId: string;
  accountId?: string;
  filters?: any[];
  enabled?: boolean;
  priority?: 'high' | 'low';
}

// Hook pour prefetcher des données en arrière-plan
export function usePrefetch(configs: PrefetchConfig[]) {
  const { set: setCache, get: getCached } = useCacheStore();
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetchData = useCallback(async (config: PrefetchConfig) => {
    if (!config.enabled) return;

    const cacheKey = generateCacheKey(
      config.collectionName,
      config.userId,
      config.accountId
    );

    // Ne pas refetch si déjà en cache
    if (prefetchedRef.current.has(cacheKey) || getCached(cacheKey)) {
      return;
    }

    try {
      const collectionRef = collection(db, config.collectionName);
      let q = query(collectionRef, where('userId', '==', config.userId));

      if (config.accountId) {
        q = query(q, where('accountId', '==', config.accountId));
      }

      if (config.filters) {
        config.filters.forEach(filter => {
          q = query(q, filter);
        });
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCache(cacheKey, data, 10 * 60 * 1000); // 10 minutes
      prefetchedRef.current.add(cacheKey);
    } catch (error) {
      console.error(`Error prefetching ${config.collectionName}:`, error);
    }
  }, [setCache, getCached]);

  useEffect(() => {
    if (!configs.length) return;

    // Prefetch high priority first
    const highPriority = configs.filter(c => c.priority === 'high' && c.enabled);
    const lowPriority = configs.filter(c => c.priority !== 'high' && c.enabled);

    // Délai pour high priority
    const highTimer = setTimeout(() => {
      highPriority.forEach(config => prefetchData(config));
    }, 100);

    // Délai pour low priority (plus long)
    const lowTimer = setTimeout(() => {
      lowPriority.forEach(config => prefetchData(config));
    }, 1000);

    return () => {
      clearTimeout(highTimer);
      clearTimeout(lowTimer);
    };
  }, [configs, prefetchData]);
}

// Hook pour prefetcher au survol (hover prefetch)
export function useHoverPrefetch() {
  const prefetchTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { set: setCache } = useCacheStore();

  const prefetchOnHover = useCallback((
    collectionName: string,
    userId: string,
    accountId?: string
  ) => {
    const key = `${collectionName}-${accountId}`;

    // Annuler le timeout précédent
    if (prefetchTimeouts.current.has(key)) {
      clearTimeout(prefetchTimeouts.current.get(key)!);
    }

    // Prefetch après 200ms de survol
    const timeout = setTimeout(async () => {
      try {
        const collectionRef = collection(db, collectionName);
        let q = query(collectionRef, where('userId', '==', userId));

        if (accountId) {
          q = query(q, where('accountId', '==', accountId));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const cacheKey = generateCacheKey(collectionName, userId, accountId);
        setCache(cacheKey, data, 5 * 60 * 1000);
      } catch (error) {
        console.error('Hover prefetch error:', error);
      }
    }, 200);

    prefetchTimeouts.current.set(key, timeout);
  }, [setCache]);

  const cancelPrefetch = useCallback((collectionName: string, accountId?: string) => {
    const key = `${collectionName}-${accountId}`;
    if (prefetchTimeouts.current.has(key)) {
      clearTimeout(prefetchTimeouts.current.get(key)!);
      prefetchTimeouts.current.delete(key);
    }
  }, []);

  return { prefetchOnHover, cancelPrefetch };
}

// Hook pour prefetcher les routes suivantes probables
export function useRoutePrefetch(currentRoute: string, userId: string, accountId?: string) {
  const routePrefetchMap: Record<string, PrefetchConfig[]> = {
    '/dashboard': [
      {
        collectionName: 'interventions',
        userId,
        accountId,
        enabled: true,
        priority: 'high'
      },
      {
        collectionName: 'expenses',
        userId,
        accountId,
        enabled: true,
        priority: 'high'
      }
    ],
    '/dashboard/interventions': [
      {
        collectionName: 'intervention_types',
        userId,
        accountId,
        enabled: true,
        priority: 'high'
      },
      {
        collectionName: 'consumables',
        userId,
        accountId,
        enabled: true,
        priority: 'high'
      }
    ],
    '/dashboard/reports': [
      {
        collectionName: 'interventions',
        userId,
        accountId,
        enabled: true,
        priority: 'high'
      },
      {
        collectionName: 'expenses',
        userId,
        accountId,
        enabled: true,
        priority: 'high'
      }
    ]
  };

  const configs = routePrefetchMap[currentRoute] || [];
  usePrefetch(configs);
}

// Hook pour prefetcher de manière intelligente basé sur l'historique
export function useIntelligentPrefetch(userId: string) {
  const navigationHistory = useRef<string[]>([]);
  const prefetchPatterns = useRef<Map<string, string[]>>(new Map());

  const recordNavigation = useCallback((route: string) => {
    navigationHistory.current.push(route);

    // Garder seulement les 10 dernières navigations
    if (navigationHistory.current.length > 10) {
      navigationHistory.current.shift();
    }

    // Analyser les patterns de navigation
    if (navigationHistory.current.length >= 3) {
      const lastThree = navigationHistory.current.slice(-3);
      const pattern = lastThree.slice(0, 2).join('->');
      const next = lastThree[2];

      if (!prefetchPatterns.current.has(pattern)) {
        prefetchPatterns.current.set(pattern, []);
      }

      const nexts = prefetchPatterns.current.get(pattern)!;
      if (!nexts.includes(next)) {
        nexts.push(next);
      }
    }
  }, []);

  const getPredictedRoutes = useCallback((currentRoute: string): string[] => {
    const history = navigationHistory.current;
    if (history.length < 2) return [];

    const lastTwo = history.slice(-2);
    const pattern = lastTwo.join('->');

    return prefetchPatterns.current.get(pattern) || [];
  }, []);

  return { recordNavigation, getPredictedRoutes };
}
