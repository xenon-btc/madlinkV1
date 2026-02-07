import React, { useState, useEffect } from 'react';
import { HardDrive, Upload, Trash2, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useLocalImageStorage } from '../lib/localImageStorage';
import { useImageSync } from '../lib/imageSync';
import { useAuthStore } from '../store/auth';

export function StorageManager() {
  const { user } = useAuthStore();
  const localStorage = useLocalImageStorage();
  const imageSync = useImageSync();

  const [stats, setStats] = useState({
    total: 0,
    synced: 0,
    unsynced: 0,
    totalSize: 0,
    totalSizeMB: '0'
  });

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0
  });

  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    refreshStats();
  }, []);

  const refreshStats = () => {
    const newStats = localStorage.getStats();
    setStats(newStats);
  };

  const handleSyncAll = async () => {
    if (!user?.uid || syncing) return;

    try {
      setSyncing(true);
      const result = await imageSync.syncPending(user.uid, (progress) => {
        setSyncProgress(progress);
      });

      alert(
        `Synchronisation terminée!\n` +
        `Réussi: ${result.completed}\n` +
        `Échoué: ${result.failed}\n` +
        `Total: ${result.total}`
      );

      refreshStats();
    } catch (error: any) {
      alert(`Erreur de synchronisation: ${error.message}`);
    } finally {
      setSyncing(false);
      setSyncProgress({ total: 0, completed: 0, failed: 0 });
    }
  };

  const handleCleanup = async () => {
    const days = prompt('Supprimer les images synchronisées de plus de combien de jours ?\n(Recommandé: 270 jours = 9 mois)', '270');

    if (!days) return;

    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum < 1) {
      alert('Nombre de jours invalide');
      return;
    }

    if (!confirm(`Supprimer les images synchronisées de plus de ${daysNum} jours ?`)) {
      return;
    }

    try {
      setCleaningUp(true);
      const deleted = await imageSync.cleanupOld(daysNum);
      alert(`${deleted} image(s) supprimée(s)`);
      refreshStats();
    } catch (error) {
      alert('Erreur lors du nettoyage');
    } finally {
      setCleaningUp(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Stockage Local
          </h2>
        </div>
        <button
          onClick={refreshStats}
          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
            Total Images
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {stats.total}
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-sm text-green-600 dark:text-green-400 mb-1">
            Synchronisées
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
            {stats.synced}
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">
            En attente
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100 flex items-center gap-2">
            {stats.unsynced}
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">
            Espace utilisé
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {stats.totalSizeMB} MB
          </div>
        </div>
      </div>

      {/* Barre de progression si synchronisation en cours */}
      {syncing && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Synchronisation en cours...
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {syncProgress.completed} / {syncProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  syncProgress.total > 0
                    ? (syncProgress.completed / syncProgress.total) * 100
                    : 0
                }%`
              }}
            />
          </div>
          {syncProgress.failed > 0 && (
            <div className="text-sm text-red-600 dark:text-red-400 mt-2">
              {syncProgress.failed} erreur(s)
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSyncAll}
          disabled={syncing || stats.unsynced === 0 || !navigator.onLine}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {syncing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Synchronisation...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Synchroniser tout ({stats.unsynced})
            </>
          )}
        </button>

        <button
          onClick={handleCleanup}
          disabled={cleaningUp || stats.synced === 0}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {cleaningUp ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Nettoyage...
            </>
          ) : (
            <>
              <Trash2 className="w-5 h-5" />
              Nettoyer anciennes images
            </>
          )}
        </button>
      </div>

      {/* Informations */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
          Comment ça marche ?
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>✓ Les photos sont sauvegardées localement sur votre appareil</li>
          <li>✓ Elles sont synchronisées automatiquement vers le cloud</li>
          <li>✓ Mode offline : travaillez sans connexion</li>
          <li>✓ Les anciennes photos synchronisées peuvent être nettoyées</li>
          <li>
            {navigator.onLine ? (
              <span className="text-green-600 dark:text-green-400">
                ● En ligne
              </span>
            ) : (
              <span className="text-orange-600 dark:text-orange-400">
                ● Hors ligne
              </span>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
