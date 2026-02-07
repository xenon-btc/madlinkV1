import { Capacitor } from '@capacitor/core';

interface LocalImage {
  id: string;
  uri: string; // URI local
  remoteUrl?: string; // URL Firebase (après upload)
  fileName: string;
  size: number;
  timestamp: number;
  synced: boolean;
  interventionId?: string;
}

class LocalImageStorage {
  private readonly STORAGE_KEY = 'madlink_local_images';
  private images: Map<string, LocalImage> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  // Charger les métadonnées depuis localStorage/IndexedDB
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.images = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading local images:', error);
    }
  }

  // Sauvegarder les métadonnées
  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.images);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving local images:', error);
    }
  }

  // Sauvegarder une image localement
  async saveImage(
    base64Data: string,
    interventionId?: string
  ): Promise<LocalImage> {
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${id}.jpg`;

    if (Capacitor.isNativePlatform()) {
      // Mode natif : sauvegarder sur le système de fichiers
      return this.saveImageNative(id, fileName, base64Data, interventionId);
    } else {
      // Mode web : sauvegarder dans IndexedDB
      return this.saveImageWeb(id, fileName, base64Data, interventionId);
    }
  }

  // Sauvegarder en mode natif (Capacitor Filesystem)
  private async saveImageNative(
    id: string,
    fileName: string,
    base64Data: string,
    interventionId?: string
  ): Promise<LocalImage> {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Créer le dossier s'il n'existe pas
      try {
        await Filesystem.mkdir({
          path: 'MadlinK/images',
          directory: Directory.Data,
          recursive: true
        });
      } catch {
        // Le dossier existe déjà
      }

      // Nettoyer le base64 (enlever le préfixe data:image/...)
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

      // Sauvegarder le fichier
      const result = await Filesystem.writeFile({
        path: `MadlinK/images/${fileName}`,
        data: cleanBase64,
        directory: Directory.Data,
        recursive: true
      });

      const localImage: LocalImage = {
        id,
        uri: result.uri,
        fileName,
        size: this.estimateBase64Size(cleanBase64),
        timestamp: Date.now(),
        synced: false,
        interventionId
      };

      this.images.set(id, localImage);
      this.saveToStorage();

      return localImage;
    } catch (error) {
      console.error('Error saving image (native):', error);
      throw error;
    }
  }

  // Sauvegarder en mode web (IndexedDB)
  private async saveImageWeb(
    id: string,
    fileName: string,
    base64Data: string,
    interventionId?: string
  ): Promise<LocalImage> {
    try {
      const db = await this.openIndexedDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');

        const imageData = {
          id,
          fileName,
          data: base64Data,
          timestamp: Date.now()
        };

        const request = store.put(imageData);

        request.onsuccess = () => {
          const localImage: LocalImage = {
            id,
            uri: `indexeddb://${id}`,
            fileName,
            size: base64Data.length,
            timestamp: Date.now(),
            synced: false,
            interventionId
          };

          this.images.set(id, localImage);
          this.saveToStorage();
          resolve(localImage);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error saving image (web):', error);
      throw error;
    }
  }

  // Récupérer une image locale
  async getImage(id: string): Promise<string | null> {
    const imageInfo = this.images.get(id);
    if (!imageInfo) return null;

    if (Capacitor.isNativePlatform()) {
      return this.getImageNative(imageInfo);
    } else {
      return this.getImageWeb(id);
    }
  }

  // Récupérer en mode natif
  private async getImageNative(imageInfo: LocalImage): Promise<string | null> {
    try {
      const { Filesystem } = await import('@capacitor/filesystem');

      const result = await Filesystem.readFile({
        path: imageInfo.uri
      });

      return `data:image/jpeg;base64,${result.data}`;
    } catch (error) {
      console.error('Error reading image (native):', error);
      return null;
    }
  }

  // Récupérer en mode web
  private async getImageWeb(id: string): Promise<string | null> {
    try {
      const db = await this.openIndexedDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const request = store.get(id);

        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.data);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error reading image (web):', error);
      return null;
    }
  }

  // Supprimer une image locale
  async deleteImage(id: string): Promise<void> {
    const imageInfo = this.images.get(id);
    if (!imageInfo) return;

    if (Capacitor.isNativePlatform()) {
      await this.deleteImageNative(imageInfo);
    } else {
      await this.deleteImageWeb(id);
    }

    this.images.delete(id);
    this.saveToStorage();
  }

  // Supprimer en mode natif
  private async deleteImageNative(imageInfo: LocalImage): Promise<void> {
    try {
      const { Filesystem } = await import('@capacitor/filesystem');
      await Filesystem.deleteFile({ path: imageInfo.uri });
    } catch (error) {
      console.error('Error deleting image (native):', error);
    }
  }

  // Supprimer en mode web
  private async deleteImageWeb(id: string): Promise<void> {
    try {
      const db = await this.openIndexedDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error deleting image (web):', error);
    }
  }

  // Obtenir toutes les images locales
  getAllImages(): LocalImage[] {
    return Array.from(this.images.values());
  }

  // Obtenir les images non synchronisées
  getUnsyncedImages(): LocalImage[] {
    return Array.from(this.images.values()).filter(img => !img.synced);
  }

  // Obtenir les images d'une intervention
  getImagesByIntervention(interventionId: string): LocalImage[] {
    return Array.from(this.images.values()).filter(
      img => img.interventionId === interventionId
    );
  }

  // Marquer comme synchronisée
  markAsSynced(id: string, remoteUrl: string): void {
    const image = this.images.get(id);
    if (image) {
      image.synced = true;
      image.remoteUrl = remoteUrl;
      this.saveToStorage();
    }
  }

  // Calculer la taille totale du stockage
  getTotalSize(): number {
    return Array.from(this.images.values()).reduce(
      (sum, img) => sum + img.size,
      0
    );
  }

  // Nettoyer les anciennes images synchronisées
  async cleanupSyncedImages(olderThanDays: number = 270): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const toDelete: string[] = [];

    for (const [id, image] of this.images.entries()) {
      if (image.synced && image.timestamp < cutoffTime) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      await this.deleteImage(id);
    }

    return toDelete.length;
  }

  // Ouvrir IndexedDB (pour le web)
  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MadlinKImages', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      };
    });
  }

  // Estimer la taille d'un base64
  private estimateBase64Size(base64: string): number {
    return Math.floor((base64.length * 3) / 4);
  }

  // Obtenir les statistiques de stockage
  getStats() {
    const images = this.getAllImages();
    const synced = images.filter(img => img.synced).length;
    const unsynced = images.filter(img => !img.synced).length;
    const totalSize = this.getTotalSize();

    return {
      total: images.length,
      synced,
      unsynced,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }
}

export const localImageStorage = new LocalImageStorage();

// Hook React pour utiliser le stockage local
export function useLocalImageStorage() {
  return {
    saveImage: (data: string, interventionId?: string) =>
      localImageStorage.saveImage(data, interventionId),
    getImage: (id: string) => localImageStorage.getImage(id),
    deleteImage: (id: string) => localImageStorage.deleteImage(id),
    getAllImages: () => localImageStorage.getAllImages(),
    getUnsyncedImages: () => localImageStorage.getUnsyncedImages(),
    getImagesByIntervention: (interventionId: string) =>
      localImageStorage.getImagesByIntervention(interventionId),
    markAsSynced: (id: string, url: string) =>
      localImageStorage.markAsSynced(id, url),
    cleanupSyncedImages: (days?: number) =>
      localImageStorage.cleanupSyncedImages(days),
    getStats: () => localImageStorage.getStats()
  };
}
