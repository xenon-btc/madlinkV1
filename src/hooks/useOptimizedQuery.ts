import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, query, where, getDocs, QueryConstraint, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCacheStore, generateCacheKey } from '../store/cache';
import { queryBatcher } from '../lib/batchLoader';

interface OptimizedQueryOptions {
  enabled?: boolean;
  cacheTime?: number;
  staleTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  keepPreviousData?: boolean;
  batchRequests?: boolean;
}

interface QueryConfig {
  collectionName: string;
  constraints?: QueryConstraint[];
  userId?: string;
  accountId?: string;
}

export function useOptimizedQuery<T = any>(
  config: QueryConfig,
  options: OptimizedQueryOptions = {}
) {
  const {
    enabled = true,
    cacheTime = 5 * 60 * 1000,
    staleTime = 2 * 60 * 1000,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    keepPreviousData = false,
    batchRequests = true
  } = options;

  const { get: getCached, set: setCache, isValid } = useCacheStore();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const isMounted = useRef(true);
  const lastFetchTime = useRef<number>(0);

  const cacheKey = useMemo(() => {
    return generateCacheKey(
      config.collectionName,
      config.userId || 'anonymous',
      config.accountId,
      { constraints: config.constraints?.length || 0 }
    );
  }, [config.collectionName, config.userId, config.accountId, config.constraints]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Vérifier si les données sont fraîches
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < staleTime) {
      return;
    }

    // Vérifier le cache
    if (!forceRefresh) {
      const cached = getCached<T[]>(cacheKey);
      if (cached && isValid(cacheKey)) {
        if (!keepPreviousData || data.length === 0) {
          setData(cached);
        }
        setLoading(false);
        return;
      }
    }

    try {
      setIsFetching(true);
      if (!keepPreviousData) {
        setLoading(true);
      }
      setError(null);

      let results: T[];

      // Utiliser le batching si activé et possible
      if (batchRequests && config.userId && !config.constraints?.length) {
        results = await queryBatcher.batchQuery<T>(
          config.collectionName,
          config.userId,
          config.accountId
        );
      } else {
        // Requête normale
        const collectionRef = collection(db, config.collectionName);
        let q = query(collectionRef);

        if (config.constraints) {
          q = query(collectionRef, ...config.constraints);
        }

        const snapshot = await getDocs(q);
        results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
      }

      if (isMounted.current) {
        setData(results);
        setCache(cacheKey, results, cacheTime);
        lastFetchTime.current = now;
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
        console.error(`Error fetching ${config.collectionName}:`, err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [
    enabled,
    config.collectionName,
    config.userId,
    config.accountId,
    config.constraints,
    cacheKey,
    cacheTime,
    staleTime,
    batchRequests,
    keepPreviousData
  ]);

  // Fetch initial
  useEffect(() => {
    if (enabled) {
      fetchData(refetchOnMount);
    }
  }, [enabled, fetchData, refetchOnMount]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    useCacheStore.getState().invalidate(cacheKey);
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    isFetching,
    refetch,
    invalidate,
    isStale: !isValid(cacheKey)
  };
}

// Hook spécialisé pour les interventions avec optimisations
export function useOptimizedInterventions(
  userId: string,
  accountId: string,
  options?: OptimizedQueryOptions
) {
  const config: QueryConfig = useMemo(() => ({
    collectionName: 'interventions',
    userId,
    accountId,
    constraints: [
      where('userId', '==', userId),
      where('accountId', '==', accountId),
      orderBy('date', 'desc')
    ]
  }), [userId, accountId]);

  return useOptimizedQuery(config, {
    cacheTime: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    batchRequests: false, // Les contraintes empêchent le batching
    ...options
  });
}

// Hook pour les stats avec memoization
export function useOptimizedStats(userId: string, accountIds: string[]) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cacheKey = useMemo(
    () => generateCacheKey('stats', userId, accountIds.join(',')),
    [userId, accountIds]
  );

  const { get: getCached, set: setCache } = useCacheStore();

  useEffect(() => {
    const fetchStats = async () => {
      // Vérifier le cache
      const cached = getCached(cacheKey);
      if (cached) {
        setStats(cached);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Requête groupée pour tous les comptes
        const collectionRef = collection(db, 'interventions');
        const q = query(
          collectionRef,
          where('userId', '==', userId),
          where('accountId', 'in', accountIds.slice(0, 10)) // Max 10 pour Firebase
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculer les stats en mémoire
        const calculated = accountIds.map(accountId => {
          const accountData = data.filter((d: any) => d.accountId === accountId);
          return {
            accountId,
            total: accountData.reduce((sum: number, d: any) => sum + (d.totalPrice || 0), 0),
            count: accountData.length
          };
        });

        setStats(calculated);
        setCache(cacheKey, calculated, 5 * 60 * 1000);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId && accountIds.length > 0) {
      fetchStats();
    }
  }, [userId, accountIds, cacheKey]);

  return { stats, loading };
}
