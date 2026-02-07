import React, { useState, useEffect } from 'react';
import { Plus, Check, Camera, Image as ImageIcon, X } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { takePictureWeb, pickFromGalleryWeb } from '../utils/camera';

interface InterventionUnitaire {
  id: string;
  referenceClient?: string;
  article?: string;
  commentaire?: string;
  prix?: number;
  paye: boolean;
  photo?: string;
  createdAt: Date;
}

export function InterventionUnitaire() {
  const { user } = useAuthStore();
  const [interventions, setInterventions] = useState<InterventionUnitaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    referenceClient: '',
    article: '',
    commentaire: '',
    prix: '',
    photo: ''
  });
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  useEffect(() => {
    if (user) {
      loadInterventions();
    }
  }, [user]);

  const loadInterventions = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'interventions_unitaires'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as InterventionUnitaire[];

      setInterventions(data);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await takePictureWeb();
      setFormData({ ...formData, photo });
      setShowPhotoOptions(false);
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const photo = await pickFromGalleryWeb();
      setFormData({ ...formData, photo });
      setShowPhotoOptions(false);
    } catch (error) {
      console.error('Erreur lors de la sélection de photo:', error);
    }
  };

  const handleRemovePhoto = () => {
    setFormData({ ...formData, photo: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Vérifier qu'au moins un champ est rempli
    if (!formData.referenceClient && !formData.article && !formData.commentaire && !formData.prix && !formData.photo) {
      alert('Veuillez remplir au moins un champ');
      return;
    }

    try {
      const newIntervention = {
        userId: user.uid,
        referenceClient: formData.referenceClient || null,
        article: formData.article || null,
        commentaire: formData.commentaire || null,
        prix: formData.prix ? parseFloat(formData.prix) : null,
        photo: formData.photo || null,
        paye: false,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'interventions_unitaires'), newIntervention);

      setFormData({
        referenceClient: '',
        article: '',
        commentaire: '',
        prix: '',
        photo: ''
      });

      await loadInterventions();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  const togglePaye = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'interventions_unitaires', id), {
        paye: !currentStatus
      });
      await loadInterventions();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette intervention ?')) return;

    try {
      await deleteDoc(doc(db, 'interventions_unitaires', id));
      await loadInterventions();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Interventions unitaires
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enregistrez vos interventions ponctuelles
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Nouvelle intervention
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Référence client
              </label>
              <input
                type="text"
                value={formData.referenceClient}
                onChange={(e) => setFormData({ ...formData, referenceClient: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Référence (facultatif)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Article
              </label>
              <input
                type="text"
                value={formData.article}
                onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Article (facultatif)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prix
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.prix}
                onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Prix (facultatif)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commentaire
              </label>
              <input
                type="text"
                value={formData.commentaire}
                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Commentaire (facultatif)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Photo (facultatif)
            </label>

            {formData.photo ? (
              <div className="relative inline-block">
                <img
                  src={formData.photo}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <Camera className="w-5 h-5" />
                  Ajouter une photo
                </button>

                {showPhotoOptions && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 overflow-hidden">
                    <button
                      type="button"
                      onClick={handleTakePhoto}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <Camera className="w-5 h-5" />
                      Prendre une photo
                    </button>
                    <button
                      type="button"
                      onClick={handlePickPhoto}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600"
                    >
                      <ImageIcon className="w-5 h-5" />
                      Choisir depuis la galerie
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full md:w-auto flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter l'intervention
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Référence client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Commentaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Photo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {interventions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Aucune intervention enregistrée
                  </td>
                </tr>
              ) : (
                interventions.map((intervention) => (
                  <tr key={intervention.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {intervention.createdAt?.toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {intervention.referenceClient || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.article || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {intervention.commentaire || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {intervention.prix ? `${intervention.prix.toFixed(2)} €` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {intervention.photo ? (
                        <img
                          src={intervention.photo}
                          alt="Photo intervention"
                          className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(intervention.photo, '_blank')}
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                      <button
                        onClick={() => togglePaye(intervention.id, intervention.paye)}
                        className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                          intervention.paye
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-red-600 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                        }`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        {intervention.paye ? 'Payé' : 'Non Payé'}
                      </button>
                      <button
                        onClick={() => handleDelete(intervention.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
