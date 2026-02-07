import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from './firebase';

interface BatchRequest {
  collection: string;
  ids: string[];
  resolve: (data: any[]) => void;
  reject: (error: Error) => void;
}

class DataBatchLoader {
  private batches: Map<string, BatchRequest[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly batchDelay = 10; // 10ms pour grouper les requêtes
  private readonly maxBatchSize = 10; // Firebase limite à 10 pour whereIn

  async load<T>(collectionName: string, id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.addToBatch(collectionName, [id], resolve, reject);
    });
  }

  async loadMany<T>(collectionName: string, ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];

    return new Promise((resolve, reject) => {
      this.addToBatch(collectionName, ids, resolve, reject);
    });
  }

  private addToBatch(
    collectionName: string,
    ids: string[],
    resolve: (data: any) => void,
    reject: (error: Error) => void
  ) {
    const key = collectionName;

    if (!this.batches.has(key)) {
      this.batches.set(key, []);
    }

    this.batches.get(key)!.push({ collection: collectionName, ids, resolve, reject });

    // Annuler le timer existant
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Créer un nouveau timer
    const timer = setTimeout(() => {
      this.executeBatch(key);
    }, this.batchDelay);

    this.timers.set(key, timer);
  }

  private async executeBatch(key: string) {
    const requests = this.batches.get(key);
    if (!requests || requests.length === 0) return;

    this.batches.delete(key);
    this.timers.delete(key);

    // Collecter tous les IDs uniques
    const allIds = new Set<string>();
    requests.forEach(req => req.ids.forEach(id => allIds.add(id)));

    try {
      // Diviser en chunks de maxBatchSize
      const idChunks = this.chunkArray(Array.from(allIds), this.maxBatchSize);
      const allResults = new Map<string, any>();

      for (const chunk of idChunks) {
        const collectionRef = collection(db, requests[0].collection);
        const q = query(collectionRef, where(documentId(), 'in', chunk));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
          allResults.set(doc.id, { id: doc.id, ...doc.data() });
        });
      }

      // Résoudre chaque requête avec ses données
      requests.forEach(req => {
        const results = req.ids
          .map(id => allResults.get(id))
          .filter(Boolean);
        req.resolve(results);
      });
    } catch (error) {
      requests.forEach(req => req.reject(error as Error));
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.batches.clear();
  }
}

export const batchLoader = new DataBatchLoader();

// Query Batcher pour grouper plusieurs requêtes similaires
interface QueryRequest {
  userId: string;
  accountId?: string;
  filters?: Record<string, any>;
  resolve: (data: any[]) => void;
  reject: (error: Error) => void;
}

class QueryBatcher {
  private pending: Map<string, QueryRequest[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly delay = 50; // 50ms pour grouper

  async batchQuery<T>(
    collectionName: string,
    userId: string,
    accountId?: string,
    filters?: Record<string, any>
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const key = this.generateKey(collectionName, userId, accountId);

      if (!this.pending.has(key)) {
        this.pending.set(key, []);
      }

      this.pending.get(key)!.push({ userId, accountId, filters, resolve, reject });

      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }

      const timer = setTimeout(() => {
        this.executeQuery(collectionName, key);
      }, this.delay);

      this.timers.set(key, timer);
    });
  }

  private async executeQuery(collectionName: string, key: string) {
    const requests = this.pending.get(key);
    if (!requests || requests.length === 0) return;

    this.pending.delete(key);
    this.timers.delete(key);

    try {
      // Exécuter une seule requête pour tous
      const firstReq = requests[0];
      const collectionRef = collection(db, collectionName);
      let q = query(collectionRef, where('userId', '==', firstReq.userId));

      if (firstReq.accountId) {
        q = query(q, where('accountId', '==', firstReq.accountId));
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Résoudre toutes les requêtes avec les mêmes données
      requests.forEach(req => {
        // Filtrer selon les critères spécifiques de chaque requête
        let filtered = results;
        if (req.filters) {
          filtered = results.filter(item => {
            return Object.entries(req.filters!).every(([key, value]) => {
              return item[key] === value;
            });
          });
        }
        req.resolve(filtered);
      });
    } catch (error) {
      requests.forEach(req => req.reject(error as Error));
    }
  }

  private generateKey(collectionName: string, userId: string, accountId?: string): string {
    return `${collectionName}::${userId}::${accountId || 'all'}`;
  }
}

export const queryBatcher = new QueryBatcher();

// Write Batcher pour grouper les écritures
interface WriteOperation {
  type: 'add' | 'update' | 'delete';
  collection: string;
  data?: any;
  id?: string;
}

class WriteBatcher {
  private operations: WriteOperation[] = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly delay = 100; // 100ms pour grouper les écritures

  async scheduleWrite(operation: WriteOperation): Promise<void> {
    this.operations.push(operation);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    return new Promise((resolve, reject) => {
      this.timer = setTimeout(async () => {
        try {
          await this.executeBatch();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, this.delay);
    });
  }

  private async executeBatch(): Promise<void> {
    if (this.operations.length === 0) return;

    const ops = [...this.operations];
    this.operations = [];

    // Grouper par type d'opération
    const grouped = {
      adds: ops.filter(op => op.type === 'add'),
      updates: ops.filter(op => op.type === 'update'),
      deletes: ops.filter(op => op.type === 'delete')
    };

    // Note: Firebase ne supporte pas les batch writes multi-collections
    // Mais on peut optimiser en regroupant les opérations similaires

    console.log('Executing batch:', {
      adds: grouped.adds.length,
      updates: grouped.updates.length,
      deletes: grouped.deletes.length
    });

    // Dans une vraie implémentation, on utiliserait writeBatch de Firebase
    // Pour le moment, on log simplement
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.executeBatch();
    }
  }
}

export const writeBatcher = new WriteBatcher();
