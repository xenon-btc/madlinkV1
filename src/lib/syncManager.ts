import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data?: any;
  docId?: string;
  timestamp: number;
  retries: number;
}

class SyncManager {
  private queue: PendingOperation[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'madlink_pending_sync';

  constructor() {
    this.loadQueue();
    this.startAutoSync();
    this.setupOnlineListener();
  }

  // Charger la queue depuis le localStorage
  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  // Sauvegarder la queue dans le localStorage
  private saveQueue() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  // Ajouter une opération à la queue
  async scheduleOperation(
    type: 'create' | 'update' | 'delete',
    collectionName: string,
    data?: any,
    docId?: string
  ): Promise<string> {
    const operation: PendingOperation = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      collection: collectionName,
      data,
      docId,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(operation);
    this.saveQueue();

    // Essayer de synchroniser immédiatement si en ligne
    if (navigator.onLine) {
      this.processQueue();
    }

    return operation.id;
  }

  // Créer un document avec synchronisation différée
  async createDeferred(collectionName: string, data: any): Promise<string> {
    // Optimistic update: retourner un ID temporaire immédiatement
    const tempId = `temp_${Date.now()}_${Math.random()}`;

    // Programmer la synchronisation
    await this.scheduleOperation('create', collectionName, {
      ...data,
      tempId,
      createdAt: serverTimestamp()
    });

    return tempId;
  }

  // Mettre à jour un document avec synchronisation différée
  async updateDeferred(collectionName: string, docId: string, data: any): Promise<void> {
    await this.scheduleOperation('update', collectionName, {
      ...data,
      updatedAt: serverTimestamp()
    }, docId);
  }

  // Supprimer un document avec synchronisation différée
  async deleteDeferred(collectionName: string, docId: string): Promise<void> {
    await this.scheduleOperation('delete', collectionName, undefined, docId);
  }

  // Traiter la queue de synchronisation
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    const operations = [...this.queue];
    const failed: PendingOperation[] = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);

        // Retirer de la queue si succès
        this.queue = this.queue.filter(op => op.id !== operation.id);
      } catch (error) {
        console.error('Sync operation failed:', error);

        operation.retries++;

        if (operation.retries < this.maxRetries) {
          failed.push(operation);
        } else {
          console.error('Max retries reached for operation:', operation);
          // Retirer après max retries
          this.queue = this.queue.filter(op => op.id !== operation.id);
        }
      }
    }

    // Remettre les opérations échouées dans la queue
    this.queue = [...failed, ...this.queue.filter(op => !operations.includes(op))];
    this.saveQueue();
    this.isProcessing = false;

    // Si des opérations restent, réessayer plus tard
    if (this.queue.length > 0 && navigator.onLine) {
      setTimeout(() => this.processQueue(), 5000);
    }
  }

  // Exécuter une opération
  private async executeOperation(operation: PendingOperation): Promise<void> {
    const collectionRef = collection(db, operation.collection);

    switch (operation.type) {
      case 'create':
        const docRef = await addDoc(collectionRef, operation.data);
        console.log('Created document:', docRef.id);
        break;

      case 'update':
        if (!operation.docId) throw new Error('No docId for update');
        const updateRef = doc(db, operation.collection, operation.docId);
        await updateDoc(updateRef, operation.data);
        console.log('Updated document:', operation.docId);
        break;

      case 'delete':
        if (!operation.docId) throw new Error('No docId for delete');
        const deleteRef = doc(db, operation.collection, operation.docId);
        await deleteDoc(deleteRef);
        console.log('Deleted document:', operation.docId);
        break;
    }
  }

  // Démarrer la synchronisation automatique
  private startAutoSync() {
    // Synchroniser toutes les 30 secondes si en ligne
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && this.queue.length > 0) {
        this.processQueue();
      }
    }, 30000);
  }

  // Écouter les changements de connexion
  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('Back online, syncing...');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('Offline mode activated');
    });
  }

  // Synchroniser manuellement
  async sync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    await this.processQueue();
  }

  // Obtenir le nombre d'opérations en attente
  getPendingCount(): number {
    return this.queue.length;
  }

  // Vider la queue (pour debug)
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  // Arrêter le manager
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const syncManager = new SyncManager();

// Hook React pour utiliser le sync manager
export function useSyncManager() {
  return {
    createDeferred: (collection: string, data: any) =>
      syncManager.createDeferred(collection, data),
    updateDeferred: (collection: string, id: string, data: any) =>
      syncManager.updateDeferred(collection, id, data),
    deleteDeferred: (collection: string, id: string) =>
      syncManager.deleteDeferred(collection, id),
    sync: () => syncManager.sync(),
    getPendingCount: () => syncManager.getPendingCount()
  };
}
