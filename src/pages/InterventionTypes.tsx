import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { collection, addDoc, query, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { useAccountSync } from '../hooks/useAccountSync';
import type { InterventionType } from '../types';

export function InterventionTypes() {
  const [types, setTypes] = useState<InterventionType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newType, setNewType] = useState({ name: '', price: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [pendingPriceUpdate, setPendingPriceUpdate] = useState<{
    id: string;
    name: string;
    oldPrice: number;
    newPrice: string;
  } | null>(null);
  const { user } = useAuthStore();
  const { getCurrentAccount } = useAccountsStore();

  const refreshData = useCallback(() => {
    fetchTypes();
  }, [user?.uid]);

  useEffect(() => {
    refreshData();
  }, [user]);

  useAccountSync(refreshData);

  const fetchTypes = async () => {
    if (!user) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
      setLoading(true);
      const typesRef = collection(db, 'intervention_types');
      const q = query(typesRef, where('userId', '==', user.uid), where('accountId', '==', currentAccount.id));
      const querySnapshot = await getDocs(q);
      
      const fetchedTypes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price
      }));

      setTypes(fetchedTypes);
    } catch (error) {
      console.error('Erreur lors de la récupération des types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: InterventionType) => {
    setEditingId(type.id);
  };

  const handlePriceUpdate = async (updateAll: boolean) => {
    if (!user || !pendingPriceUpdate) return;

    try {
      const { id, newPrice } = pendingPriceUpdate;
      const typeRef = doc(db, 'intervention_types', id);
      
      await updateDoc(typeRef, {
        price: Number(newPrice),
        updatedAt: serverTimestamp()
      });

      if (updateAll) {
        // Update all existing interventions with this type
        const interventionsRef = collection(db, 'interventions');
        const q = query(interventionsRef, where('userId', '==', user.uid), where('accountId', '==', currentAccount.accountId));
        const querySnapshot = await getDocs(q);

        const batch = writeBatch(db);
        querySnapshot.docs.forEach(doc => {
          const intervention = doc.data();
          if (intervention.selectedTypes) {
            const updatedTypes = intervention.selectedTypes.map((type: any) => {
              if (type.id === id) {
                return { ...type, price: Number(newPrice) };
              }
              return type;
            });

            const newTotalPrice = updatedTypes.reduce((sum: number, type: any) => sum + type.price, 0);

            batch.update(doc.ref, {
              selectedTypes: updatedTypes,
              totalPrice: newTotalPrice
            });
          }
        });

        await batch.commit();
      }

      fetchTypes();
      setEditingId(null);
      setShowPriceDialog(false);
      setPendingPriceUpdate(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du type:', error);
    }
  };

  const handleSave = async (id: string, updatedName: string, updatedPrice: string) => {
    if (!user) return;

    const type = types.find(t => t.id === id);
    if (type && type.price !== Number(updatedPrice)) {
      setPendingPriceUpdate({
        id,
        name: updatedName,
        oldPrice: type.price,
        newPrice: updatedPrice
      });
      setShowPriceDialog(true);
    } else {
      try {
        const typeRef = doc(db, 'intervention_types', id);
        await updateDoc(typeRef, {
          name: updatedName,
          updatedAt: serverTimestamp()
        });

        fetchTypes();
        setEditingId(null);
      } catch (error) {
        console.error('Erreur lors de la mise à jour du type:', error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce type d\'intervention ?')) {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
        try {
          await deleteDoc(doc(db, 'intervention_types', id));
          fetchTypes();
        } catch (error) {
          console.error('Erreur lors de la suppression du type:', error);
        }
      }
    }
  };

  const handleAdd = async () => {
    if (!user || !newType.name || !newType.price) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
      await addDoc(collection(db, 'intervention_types'), {
        name: newType.name,
        price: Number(newType.price),
        userId: user.uid,
        accountId: currentAccount.id,
        createdAt: serverTimestamp()
      });

      setNewType({ name: '', price: '' });
      setIsAdding(false);
      fetchTypes();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du type:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Articles</h1>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Ajouter un article
          </button>
        )}
      </div>

      {showPriceDialog && pendingPriceUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Modification du prix
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Vous modifiez le prix de "{pendingPriceUpdate.name}" de {pendingPriceUpdate.oldPrice}€ à {pendingPriceUpdate.newPrice}€.
              Comment souhaitez-vous appliquer ce changement ?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handlePriceUpdate(true)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Mettre à jour toutes les interventions existantes
              </button>
              <button
                onClick={() => handlePriceUpdate(false)}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Appliquer uniquement aux futures interventions
              </button>
              <button
                onClick={() => {
                  setShowPriceDialog(false);
                  setPendingPriceUpdate(null);
                  setEditingId(null);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Prix (€)
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isAdding && (
                  <tr>
                    <td className="px-4 sm:px-6 py-4">
                      <input
                        type="text"
                        value={newType.name}
                        onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Nom de l'article"
                      />
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <input
                        type="number"
                        value={newType.price}
                        onChange={(e) => setNewType({ ...newType, price: e.target.value })}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Prix"
                      />
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right space-x-2">
                      <button
                        onClick={handleAdd}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setNewType({ name: '', price: '' });
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )}
                {types.map(type => (
                  <tr key={type.id}>
                    <td className="px-4 sm:px-6 py-4">
                      {editingId === type.id ? (
                        <input
                          type="text"
                          defaultValue={type.name}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          id={`name-${type.id}`}
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{type.name}</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {editingId === type.id ? (
                        <input
                          type="number"
                          defaultValue={type.price}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          id={`price-${type.id}`}
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{type.price} €</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right space-x-2">
                      {editingId === type.id ? (
                        <>
                          <button
                            onClick={() => handleSave(
                              type.id,
                              (document.getElementById(`name-${type.id}`) as HTMLInputElement).value,
                              (document.getElementById(`price-${type.id}`) as HTMLInputElement).value
                            )}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(type)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(type.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {types.length === 0 && !isAdding && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucun type d'article enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}