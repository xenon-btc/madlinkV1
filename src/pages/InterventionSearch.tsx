import React, { useState } from 'react';
import { Search, Calendar, Euro, MessageSquare, Image, AlertTriangle, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface InterventionDetails {
  id: string;
  date: Date;
  clientNumber: string;
  selectedTypes: Array<{
    name: string;
    price: number;
  }>;
  totalPrice: number;
  comment: string;
  photos: string[];
}

export function InterventionSearch() {
  const { user } = useAuthStore();
  const { getCurrentAccount } = useAccountsStore();
  const [searchNumber, setSearchNumber] = useState('');
  const [intervention, setIntervention] = useState<InterventionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid || !searchNumber.trim()) {
      setError('Veuillez saisir un numéro d\'intervention');
      return;
    }

    const currentAccount = getCurrentAccount();
    if (!currentAccount) {
      setError('Aucun compte sélectionné');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIntervention(null);
      setSearched(false);

      // Rechercher l'intervention dans la base de données
      const interventionsRef = collection(db, 'interventions');
      const q = query(
        interventionsRef,
        where('userId', '==', user.uid),
        where('accountId', '==', currentAccount.id),
        where('clientNumber', '==', searchNumber.trim())
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError(`Aucune intervention trouvée avec la référence "${searchNumber}"`);
        setSearched(true);
        return;
      }

      // Prendre la première intervention trouvée (il ne devrait y en avoir qu'une)
      const doc = querySnapshot.docs[0];
      const data = doc.data();

      const interventionDetails: InterventionDetails = {
        id: doc.id,
        date: data.date?.toDate() || new Date(),
        clientNumber: data.clientNumber || '',
        selectedTypes: data.selectedTypes || [],
        totalPrice: data.totalPrice || 0,
        comment: data.comment || '',
        photos: data.photos || []
      };

      setIntervention(interventionDetails);
      setSearched(true);

    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      setError('Erreur lors de la recherche de l\'intervention');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchNumber('');
    setIntervention(null);
    setError(null);
    setSearched(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recherche d'intervention</h1>
      </div>

      {/* Formulaire de recherche */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="searchNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Référence d'intervention
            </label>
            <div className="relative">
              <input
                type="text"
                id="searchNumber"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Saisissez la référence d'intervention à rechercher..."
                disabled={loading}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !searchNumber.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Rechercher
                </>
              )}
            </button>

            {(intervention || error || searched) && (
              <button
                type="button"
                onClick={handleReset}
                className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Nouvelle recherche
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Résultats de la recherche */}
      {intervention && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {/* En-tête */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-4">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
              Intervention {intervention.clientNumber}
            </h2>
            <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
              Détails de l'intervention trouvée
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Date */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Date d'intervention</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {format(intervention.date, 'EEEE dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>

            {/* Prix */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Euro className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Prix total</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {intervention.totalPrice.toLocaleString('fr-FR')} €
                </p>
                {intervention.selectedTypes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Détail :</p>
                    {intervention.selectedTypes.map((type, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{type.name}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{type.price} €</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Commentaire */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Commentaire</h3>
                {intervention.comment ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {intervention.comment}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">Aucun commentaire</p>
                )}
              </div>
            </div>

            {/* Photos */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Image className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Photos ({intervention.photos.length})
                </h3>
                {intervention.photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {intervention.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1} de l'intervention`}
                          className="w-full h-48 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <a
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-opacity"
                          >
                            Voir en grand
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic">Aucune photo disponible</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message si aucun résultat */}
      {searched && !intervention && !error && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune intervention trouvée
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Vérifiez la référence d'intervention et réessayez
          </p>
        </div>
      )}
    </div>
  );
}