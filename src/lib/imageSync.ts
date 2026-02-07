import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import { localImageStorage } from './localImageStorage';

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
}

class ImageSyncManager {
  private isSyncing = false;
  private syncQueue: string[] = [];
  private progressCallback?: (progress: SyncProgress) => void;

  // Sauvegarder une image localement ET uploader vers Firebase
  async saveAndSync(
    base64Data: string,
    userId: string,
    interventionId?: string,
    autoSync: boolean = true
  ): Promise<{ localId: string; remoteUrl?: string }> {
    // 1. Sauvegarder localement d'abord (rapide, toujours disponible)
    const localImage = await localImageStorage.saveImage(base64Data, interventionId);

    // 2. Uploader vers Firebase si en ligne et autoSync activé
    if (autoSync && navigator.onLine) {
      try {
        const remoteUrl = await this.uploadToFirebase(
          localImage.id,
          base64Data,
          userId,
          interventionId
        );

        localImageStorage.markAsSynced(localImage.id, remoteUrl);

        return { localId: localImage.id, remoteUrl };
      } catch (error) {
        console.error('Upload failed, will retry later:', error);
        // L'image reste locale et sera synchronisée plus tard
      }
    }

    return { localId: localImage.id };
  }

  // Uploader une image vers Firebase Storage
  private async uploadToFirebase(
    imageId: string,
    base64Data: string,
    userId: string,
    interventionId?: string
  ): Promise<string> {
    const path = interventionId
      ? `interventions/${userId}/${interventionId}/${imageId}.jpg`
      : `users/${userId}/images/${imageId}.jpg`;

    const storageRef = ref(storage, path);

    // Upload du base64
    const snapshot = await uploadString(storageRef, base64Data, 'data_url');

    // Obtenir l'URL de téléchargement
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return downloadUrl;
  }

  // Synchroniser toutes les images en attente
  async syncPendingImages(
    userId: string,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncProgress> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    this.isSyncing = true;
    this.progressCallback = onProgress;

    const unsyncedImages = localImageStorage.getUnsyncedImages();
    const progress: SyncProgress = {
      total: unsyncedImages.length,
      completed: 0,
      failed: 0
    };

    for (const imageInfo of unsyncedImages) {
      progress.currentFile = imageInfo.fileName;
      onProgress?.(progress);

      try {
        // Récupérer l'image locale
        const base64Data = await localImageStorage.getImage(imageInfo.id);
        if (!base64Data) {
          progress.failed++;
          continue;
        }

        // Uploader vers Firebase
        const remoteUrl = await this.uploadToFirebase(
          imageInfo.id,
          base64Data,
          userId,
          imageInfo.interventionId
        );

        // Marquer comme synchronisée
        localImageStorage.markAsSynced(imageInfo.id, remoteUrl);

        progress.completed++;
      } catch (error) {
        console.error(`Failed to sync image ${imageInfo.id}:`, error);
        progress.failed++;
      }
    }

    this.isSyncing = false;
    this.progressCallback = undefined;

    return progress;
  }

  // Synchroniser les images d'une intervention spécifique
  async syncInterventionImages(
    interventionId: string,
    userId: string
  ): Promise<string[]> {
    const images = localImageStorage.getImagesByIntervention(interventionId);
    const syncedUrls: string[] = [];

    for (const imageInfo of images) {
      if (imageInfo.synced && imageInfo.remoteUrl) {
        syncedUrls.push(imageInfo.remoteUrl);
        continue;
      }

      try {
        const base64Data = await localImageStorage.getImage(imageInfo.id);
        if (!base64Data) continue;

        const remoteUrl = await this.uploadToFirebase(
          imageInfo.id,
          base64Data,
          userId,
          interventionId
        );

        localImageStorage.markAsSynced(imageInfo.id, remoteUrl);
        syncedUrls.push(remoteUrl);
      } catch (error) {
        console.error(`Failed to sync image ${imageInfo.id}:`, error);
      }
    }

    return syncedUrls;
  }

  // Récupérer une image (locale ou remote)
  async getImage(imageId: string): Promise<string | null> {
    // D'abord essayer localement
    const localImage = await localImageStorage.getImage(imageId);
    if (localImage) return localImage;

    // Si pas en local, essayer de récupérer l'info
    const images = localImageStorage.getAllImages();
    const imageInfo = images.find(img => img.id === imageId);

    if (imageInfo?.remoteUrl) {
      // Si on a l'URL remote, la retourner
      return imageInfo.remoteUrl;
    }

    return null;
  }

  // Supprimer une image (locale ET remote)
  async deleteImage(
    imageId: string,
    userId: string,
    deleteRemote: boolean = true
  ): Promise<void> {
    const images = localImageStorage.getAllImages();
    const imageInfo = images.find(img => img.id === imageId);

    // Supprimer du serveur si demandé et si l'image est synchronisée
    if (deleteRemote && imageInfo?.remoteUrl) {
      try {
        const storageRef = ref(storage, imageInfo.remoteUrl);
        await deleteObject(storageRef);
      } catch (error) {
        console.error('Failed to delete remote image:', error);
      }
    }

    // Supprimer localement
    await localImageStorage.deleteImage(imageId);
  }

  // Nettoyer les images synchronisées anciennes
  async cleanupOldImages(olderThanDays: number = 270): Promise<number> {
    return localImageStorage.cleanupSyncedImages(olderThanDays);
  }

  // Obtenir les statistiques
  getStats() {
    return localImageStorage.getStats();
  }

  // Vérifier si la synchronisation est en cours
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

export const imageSyncManager = new ImageSyncManager();

// Hook React pour la synchronisation d'images
export function useImageSync() {
  return {
    saveAndSync: (
      data: string,
      userId: string,
      interventionId?: string,
      autoSync?: boolean
    ) => imageSyncManager.saveAndSync(data, userId, interventionId, autoSync),

    syncPending: (userId: string, onProgress?: (progress: any) => void) =>
      imageSyncManager.syncPendingImages(userId, onProgress),

    syncIntervention: (interventionId: string, userId: string) =>
      imageSyncManager.syncInterventionImages(interventionId, userId),

    getImage: (imageId: string) => imageSyncManager.getImage(imageId),

    deleteImage: (imageId: string, userId: string, deleteRemote?: boolean) =>
      imageSyncManager.deleteImage(imageId, userId, deleteRemote),

    cleanupOld: (days?: number) => imageSyncManager.cleanupOldImages(days),

    getStats: () => imageSyncManager.getStats(),

    isSyncing: () => imageSyncManager.isSyncInProgress()
  };
}
