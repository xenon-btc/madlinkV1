import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Package } from 'lucide-react';
import { collection, addDoc, query, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { useAccountSync } from '../hooks/useAccountSync';

interface Consumable {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

export function Consumables() {
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newConsumable, setNewConsumable] = useState({ name: '', price: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const { getCurrentAccount, accountVersion } = useAccountsStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  useAccountSync(refreshData);

  useEffect(() => {
    if (!user) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    setLoading(true);
    const consumablesRef = collection(db, 'consumables');
    const q = query(consumablesRef, where('userId', '==', user.uid), where('accountId', '==', currentAccount.id));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const fetchedConsumables = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price,
        isDefault: doc.data().isDefault || false
      }));

      // Si aucun consommable n'existe, créer le touret par défaut
      if (fetchedConsumables.length === 0) {
        try {
          await addDoc(consumablesRef, {
            name: 'Touret 500m',
            price: 500,
            isDefault: true,
            userId: user.uid,
            accountId: currentAccount.id,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Erreur lors de la création du consommable par défaut:', error);
        }
      } else {
        setConsumables(fetchedConsumables);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, refreshTrigger]);

  const handleEdit = (consumable: Consumable) => {
    setEditingId(consumable.id);
  };

  const handleSave = async (id: string, updatedName: string, updatedPrice: string) => {
    if (!user) return;

    try {
      const consumableRef = doc(db, 'consumables', id);
      await updateDoc(consumableRef, {
        name: updatedName,
        price: Number(updatedPrice),
        updatedAt: serverTimestamp()
      });

      setEditingId(null);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du consommable:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce consommable ?')) {
      try {
        await deleteDoc(doc(db, 'consumables', id));
      } catch (error) {
        console.error('Erreur lors de la suppression du consommable:', error);
      }
    }
  };

  const handleAdd = async () => {
    if (!user || !newConsumable.name || !newConsumable.price) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
      await addDoc(collection(db, 'consumables'), {
        name: newConsumable.name,
        price: Number(newConsumable.price),
        userId: user.uid,
        accountId: currentAccount.id,
        createdAt: serverTimestamp()
      });

      setNewConsumable({ name: '', price: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du consommable:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consommables</h1>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Ajouter un consommable
          </button>
        )}
      </div>

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
                    Consommable
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
                        value={newConsumable.name}
                        onChange={(e) => setNewConsumable({ ...newConsumable, name: e.target.value })}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Nom du consommable"
                      />
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <input
                        type="number"
                        value={newConsumable.price}
                        onChange={(e) => setNewConsumable({ ...newConsumable, price: e.target.value })}
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
                          setNewConsumable({ name: '', price: '' });
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )}
                {consumables.map(consumable => (
                  <tr key={consumable.id}>
                    <td className="px-4 sm:px-6 py-4">
                      {editingId === consumable.id ? (
                        <input
                          type="text"
                          defaultValue={consumable.name}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          id={`name-${consumable.id}`}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-white">{consumable.name}</span>
                          {consumable.isDefault && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              <Package className="w-3 h-3 mr-1" />
                              Par défaut
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      {editingId === consumable.id ? (
                        <input
                          type="number"
                          defaultValue={consumable.price}
                          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          id={`price-${consumable.id}`}
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{consumable.price} €</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right space-x-2">
                      {editingId === consumable.id ? (
                        <>
                          <button
                            onClick={() => handleSave(
                              consumable.id,
                              (document.getElementById(`name-${consumable.id}`) as HTMLInputElement).value,
                              (document.getElementById(`price-${consumable.id}`) as HTMLInputElement).value
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
                            onClick={() => handleEdit(consumable)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(consumable.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {consumables.length === 0 && !isAdding && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucun consommable enregistré
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