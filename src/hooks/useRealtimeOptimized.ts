import { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, onSnapshot, QueryConstraint, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCacheStore, generateCacheKey } from '../store/cache';

interface RealtimeOptions {
  enabled?: boolean;
  throttle?: number; // ms entre les mises à jour
  onlyOnFocus?: boolean; // Écouter seulement quand la fenêtre est focus
  batchUpdates?: boolean; // Grouper les mises à jour
}

// Hook optimisé pour les listeners en temps réel
export function useRealtimeOptimized<T = any>(
  collectionName: string,
  constraints: QueryConstraint[],
  options: RealtimeOptions = {}
) {
  const {
    enabled = true,
    throttle = 1000,
    onlyOnFocus = true,
    batchUpdates = true
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const pendingUpdatesRef = useRef<T[]>([]);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isWindowFocused = useRef(true);

  const { set: setCache } = useCacheStore();

  const applyUpdate = useCallback((newData: T[]) => {
    setData(newData);
    const cacheKey = generateCacheKey(collectionName, 'realtime');
    setCache(cacheKey, newData, 60 * 1000); // 1 minute
    lastUpdateRef.current = Date.now();
  }, [collectionName, setCache]);

  const handleUpdate = useCallback((newData: T[]) => {
    const now = Date.now();

    if (batchUpdates) {
      // Stocker les mises à jour en attente
      pendingUpdatesRef.current = newData;

      // Throttle les mises à jour
      if (now - lastUpdateRef.current < throttle) {
        // Planifier une mise à jour
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
        }

        updateTimerRef.current = setTimeout(() => {
          if (pendingUpdatesRef.current.length > 0) {
            applyUpdate(pendingUpdatesRef.current);
            pendingUpdatesRef.current = [];
          }
        }, throttle);
      } else {
        // Appliquer immédiatement
        applyUpdate(newData);
      }
    } else {
      applyUpdate(newData);
    }
  }, [batchUpdates, throttle, applyUpdate]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const setupListener = () => {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...constraints);

      unsubscribeRef.current = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];

          handleUpdate(docs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`Realtime error for ${collectionName}:`, err);
          setError(err as Error);
          setLoading(false);
        }
      );
    };

    if (!onlyOnFocus || isWindowFocused.current) {
      setupListener();
    }

    // Gérer le focus de la fenêtre
    const handleFocus = () => {
      isWindowFocused.current = true;
      if (onlyOnFocus && !unsubscribeRef.current) {
        setupListener();
      }
    };

    const handleBlur = () => {
      isWindowFocused.current = false;
      if (onlyOnFocus && unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };

    if (onlyOnFocus) {
      window.addEventListener('focus', handleFocus);
      window.addEventListener('blur', handleBlur);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      if (onlyOnFocus) {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('blur', handleBlur);
      }
    };
  }, [enabled, collectionName, constraints, onlyOnFocus, handleUpdate]);

  return { data, loading, error };
}

// Hook pour gérer plusieurs listeners avec optimisation
export function useMultipleRealtimeOptimized(
  listeners: Array<{
    collectionName: string;
    constraints: QueryConstraint[];
    key: string;
  }>,
  options: RealtimeOptions = {}
) {
  const [data, setData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const unsubscribesRef = useRef<Map<string, Unsubscribe>>(new Map());

  useEffect(() => {
    if (!listeners.length) {
      setLoading(false);
      return;
    }

    let loadedCount = 0;
    const totalListeners = listeners.length;

    listeners.forEach(({ collectionName, constraints, key }) => {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setData(prev => ({
            ...prev,
            [key]: docs
          }));

          loadedCount++;
          if (loadedCount === totalListeners) {
            setLoading(false);
          }
        },
        (error) => {
          console.error(`Error listening to ${collectionName}:`, error);
          loadedCount++;
          if (loadedCount === totalListeners) {
            setLoading(false);
          }
        }
      );

      unsubscribesRef.current.set(key, unsubscribe);
    });

    return () => {
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribesRef.current.clear();
    };
  }, [listeners]);

  return { data, loading };
}

// Hook pour listener conditionnel (seulement si nécessaire)
export function useConditionalRealtime<T = any>(
  collectionName: string,
  constraints: QueryConstraint[],
  condition: boolean
) {
  const [data, setData] = useState<T[]>([]);
  const wasEnabledRef = useRef(false);

  const { data: realtimeData, loading } = useRealtimeOptimized<T>(
    collectionName,
    constraints,
    { enabled: condition }
  );

  useEffect(() => {
    if (condition) {
      setData(realtimeData);
      wasEnabledRef.current = true;
    } else if (wasEnabledRef.current) {
      // Garder les dernières données quand on désactive
      // Ne pas effacer
    }
  }, [condition, realtimeData]);

  return { data, loading, isActive: condition };
}
