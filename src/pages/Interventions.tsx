import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Plus, X, Trash2, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, orderBy, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadInterventionImage } from '../lib/storage';
import { useAuthStore } from '../store/auth';
import { useAccountsStore } from '../store/accounts';
import { useAccountSync } from '../hooks/useAccountSync';
import type { InterventionType } from '../types';

interface Consumable {
  id: string;
  name: string;
  price: number;
}

export function Interventions() {
  const [searchParams] = useSearchParams();
  const [interventions, setInterventions] = useState<any[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTypesDropdownOpen, setIsTypesDropdownOpen] = useState(false);
  const [isConsumablesDropdownOpen, setIsConsumablesDropdownOpen] = useState(false);
  const [showMetersModal, setShowMetersModal] = useState(false);
  const [selectedTouret, setSelectedTouret] = useState<Consumable | null>(null);
  const [metersUsed, setMetersUsed] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const consumablesDropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { getCurrentAccount, setCurrentAccount, accounts, accountVersion } = useAccountsStore();
  
  const [types, setTypes] = useState<InterventionType[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedConsumables, setSelectedConsumables] = useState<Array<{
    id: string;
    name: string;
    price: number;
    metersUsed?: number;
  }>>([]);
  
  const [newIntervention, setNewIntervention] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    clientNumber: '',
    type: '',
    comment: '',
    isPlusValue: false,
    isSuivi: false
  });

  const [activeTab, setActiveTab] = useState<'all' | 'plus-value' | 'suivi'>('all');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTypesDropdownOpen(false);
      }
      if (consumablesDropdownRef.current && !consumablesDropdownRef.current.contains(event.target as Node)) {
        setIsConsumablesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const accountParam = searchParams.get('account');
    if (accountParam && accounts.length > 0) {
      const targetAccount = accounts.find(acc => acc.id === accountParam);
      if (targetAccount) {
        setCurrentAccount(targetAccount.id);
      }
    }
  }, [searchParams, accounts, setCurrentAccount]);

  const refreshAllData = useCallback(() => {
    if (user?.uid) {
      fetchInterventions();
      fetchTypes();
      fetchConsumables();
    }
  }, [user?.uid]);

  useEffect(() => {
    refreshAllData();
  }, [user]);

  useAccountSync(refreshAllData);

  const fetchTypes = async () => {
    if (!user?.uid) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
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
      setError('Erreur lors de la récupération des types d\'intervention');
    }
  };

  const fetchConsumables = async () => {
    if (!user?.uid) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
      const consumablesRef = collection(db, 'consumables');
      const q = query(consumablesRef, where('userId', '==', user.uid), where('accountId', '==', currentAccount.id));
      const querySnapshot = await getDocs(q);
      
      const fetchedConsumables = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price
      }));

      setConsumables(fetchedConsumables);
    } catch (error) {
      console.error('Erreur lors de la récupération des consommables:', error);
    }
  };
  const fetchInterventions = async () => {
    if (!user?.uid) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
      setLoading(true);
      setError(null);
      const interventionsRef = collection(db, 'interventions');
      const q = query(
        interventionsRef,
        where('userId', '==', user.uid),
        where('accountId', '==', currentAccount.id),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const fetchedInterventions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate() || new Date()
      }));

      setInterventions(fetchedInterventions);
    } catch (error) {
      console.error('Erreur lors de la récupération des interventions:', error);
      setError('Erreur lors de la récupération des interventions');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPhotos = Array.from(files);
      const totalPhotos = selectedPhotos.length + newPhotos.length;
      
      if (totalPhotos <= 2) {
        setSelectedPhotos(prev => [...prev, ...newPhotos]);
        const newPreviewUrls = newPhotos.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
      }
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleTypeChange = (typeId: string) => {
    // Toujours ajouter l'article, même s'il est déjà sélectionné
    setSelectedTypes(prev => [...prev, typeId]);
  };

  const removeSelectedType = (indexToRemove: number) => {
    setSelectedTypes(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleConsumableChange = (consumable: Consumable) => {
    // Vérifier si c'est un touret (contient "touret" dans le nom, insensible à la casse)
    if (consumable.name.toLowerCase().includes('touret')) {
      setSelectedTouret(consumable);
      setShowMetersModal(true);
    } else {
      // Ajouter directement le consommable
      setSelectedConsumables(prev => [...prev, {
        id: consumable.id,
        name: consumable.name,
        price: consumable.price
      }]);
    }
  };

  const handleMetersConfirm = () => {
    if (!selectedTouret || !metersUsed) return;

    const meters = parseFloat(metersUsed);
    if (meters <= 0) return;

    // Calculer le prix au mètre (prix total / 500m)
    const pricePerMeter = selectedTouret.price / 500;
    const totalPrice = pricePerMeter * meters;

    setSelectedConsumables(prev => [...prev, {
      id: selectedTouret.id,
      name: `${selectedTouret.name} (${meters}m)`,
      price: totalPrice,
      metersUsed: meters
    }]);

    setShowMetersModal(false);
    setSelectedTouret(null);
    setMetersUsed('');
  };

  const removeSelectedConsumable = (indexToRemove: number) => {
    setSelectedConsumables(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  const calculateTotalPrice = () => {
    const typesTotal = selectedTypes.reduce((total, typeId) => {
      const type = types.find(t => t.id === typeId);
      return total + (type?.price || 0);
    }, 0);

    return typesTotal;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid || (selectedTypes.length === 0 && selectedConsumables.length === 0)) return;

    const currentAccount = getCurrentAccount();
    if (!currentAccount) return;

    try {
      setIsSubmitting(true);
      setError(null);
      
      const selectedTypeDetails = selectedTypes.map(typeId => {
        const type = types.find(t => t.id === typeId);
        return {
          id: type?.id,
          name: type?.name,
          price: type?.price
        };
      });

      const totalPrice = calculateTotalPrice();

      const interventionData = {
        date: Timestamp.fromDate(new Date(newIntervention.date)),
        clientNumber: newIntervention.clientNumber,
        selectedTypes: selectedTypeDetails,
        selectedConsumables: selectedConsumables,
        totalPrice: totalPrice,
        userId: user.uid,
        accountId: currentAccount.id,
        comment: newIntervention.comment,
        isPlusValue: newIntervention.isPlusValue,
        isSuivi: newIntervention.isSuivi,
        showInPlusValue: newIntervention.isPlusValue,
        showInSuivi: newIntervention.isSuivi,
        createdAt: serverTimestamp(),
        photos: []
      };

      const interventionRef = await addDoc(collection(db, 'interventions'), interventionData);

      if (selectedPhotos.length > 0) {
        const photoUrls = await Promise.all(
          selectedPhotos.map(photo => uploadInterventionImage(photo, interventionRef.id))
        );

        await updateDoc(doc(db, 'interventions', interventionRef.id), { photos: photoUrls });
      }
      
      setNewIntervention({
        date: format(new Date(), 'yyyy-MM-dd'),
        clientNumber: '',
        type: '',
        comment: '',
        isPlusValue: false,
        isSuivi: false
      });
      setSelectedTypes([]);
      setSelectedConsumables([]);
      setSelectedPhotos([]);
      setPreviewUrls([]);
      setIsAdding(false);
      await fetchInterventions();
    } catch (error) {
      console.error('Erreur lors de la création de l\'intervention:', error);
      setError('Erreur lors de la création de l\'intervention');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.uid) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      try {
        setError(null);
        await deleteDoc(doc(db, 'interventions', id));
        await fetchInterventions();
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'intervention:', error);
        setError('Erreur lors de la suppression de l\'intervention');
      }
    }
  };

  const handleRemoveFromTab = async (id: string, tab: 'plus-value' | 'suivi') => {
    if (!user?.uid) return;

    const confirmMessage = tab === 'plus-value'
      ? 'Retirer cette intervention de l\'onglet Plus-value ?'
      : 'Retirer cette intervention de l\'onglet Suivi ?';

    if (window.confirm(confirmMessage)) {
      try {
        setError(null);
        const updateData = tab === 'plus-value'
          ? { showInPlusValue: false }
          : { showInSuivi: false };

        await updateDoc(doc(db, 'interventions', id), updateData);
        await fetchInterventions();
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        setError('Erreur lors de la mise à jour de l\'intervention');
      }
    }
  };

  const getFilteredInterventions = () => {
    switch (activeTab) {
      case 'plus-value':
        return interventions.filter(i => i.showInPlusValue === true);
      case 'suivi':
        return interventions.filter(i => i.showInSuivi === true);
      default:
        return interventions;
    }
  };

  const filteredInterventions = getFilteredInterventions();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Interventions</h1>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Nouvelle intervention
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Toutes les interventions
              <span className="ml-2 text-gray-400">({interventions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('plus-value')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'plus-value'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Plus-value
              <span className="ml-2 text-gray-400">({interventions.filter(i => i.showInPlusValue === true).length})</span>
            </button>
            <button
              onClick={() => setActiveTab('suivi')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suivi'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Suivi
              <span className="ml-2 text-gray-400">({interventions.filter(i => i.showInSuivi === true).length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Modal pour les mètres */}
      {showMetersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quantité utilisée - {selectedTouret?.name}
            </h3>
            <div className="mb-4">
              <label htmlFor="meters" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Mètres utilisés
              </label>
              <input
                type="number"
                id="meters"
                value={metersUsed}
                onChange={(e) => setMetersUsed(e.target.value)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Ex: 50"
                min="1"
                max="500"
              />
              {selectedTouret && metersUsed && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Coût calculé: {((selectedTouret.price / 500) * parseFloat(metersUsed)).toFixed(2)} €
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleMetersConfirm}
                disabled={!metersUsed || parseFloat(metersUsed) <= 0}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Confirmer
              </button>
              <button
                onClick={() => {
                  setShowMetersModal(false);
                  setSelectedTouret(null);
                  setMetersUsed('');
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Date d'intervention
                </label>
                <input
                  type="date"
                  id="date"
                  value={newIntervention.date}
                  onChange={(e) => setNewIntervention({ ...newIntervention, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="clientNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Référence client
                </label>
                <input
                  type="text"
                  id="clientNumber"
                  value={newIntervention.clientNumber}
                  onChange={(e) => setNewIntervention({ ...newIntervention, clientNumber: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Articles
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsTypesDropdownOpen(!isTypesDropdownOpen)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-700 dark:text-gray-200">
                      {selectedTypes.length > 0
                        ? `${selectedTypes.length} article${selectedTypes.length > 1 ? 's' : ''} ajouté${selectedTypes.length > 1 ? 's' : ''}`
                        : 'Sélectionner les articles'}
                    </span>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>

                  {isTypesDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                      <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                        {types.map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => handleTypeChange(type.id)}
                            className="w-full flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded text-left"
                          >
                            <Plus className="w-4 h-4 mr-3 text-blue-600" />
                            <span className="ml-3 text-gray-700 dark:text-gray-200">{type.name}</span>
                            <span className="ml-auto text-gray-500 dark:text-gray-400">{type.price} €</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {selectedTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTypes.map((typeId, index) => {
                      const type = types.find(t => t.id === typeId);
                      return type ? (
                        <div
                          key={`${type.id}-${index}`}
                          className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm"
                        >
                          <span>{type.name} ({type.price}€)</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedType(index)}
                            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                {selectedTypes.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Total : {calculateTotalPrice().toLocaleString('fr-FR')} €
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Consommables
                </label>
                <div className="relative" ref={consumablesDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsConsumablesDropdownOpen(!isConsumablesDropdownOpen)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-left flex items-center justify-between"
                  >
                    <span className="text-gray-700 dark:text-gray-200">
                      {selectedConsumables.length > 0
                        ? `${selectedConsumables.length} consommable${selectedConsumables.length > 1 ? 's' : ''} ajouté${selectedConsumables.length > 1 ? 's' : ''}`
                        : 'Sélectionner les consommables'}
                    </span>
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </button>

                  {isConsumablesDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                      <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
                        {consumables.map(consumable => (
                          <button
                            key={consumable.id}
                            type="button"
                            onClick={() => handleConsumableChange(consumable)}
                            className="w-full flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded text-left"
                          >
                            <Plus className="w-4 h-4 mr-3 text-green-600" />
                            <span className="ml-3 text-gray-700 dark:text-gray-200">{consumable.name}</span>
                            <span className="ml-auto text-gray-500 dark:text-gray-400">{consumable.price} €</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {selectedConsumables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedConsumables.map((consumable, index) => (
                      <div
                        key={`${consumable.id}-${index}`}
                        className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-sm"
                      >
                        <span>{consumable.name} ({consumable.price.toFixed(2)}€)</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedConsumable(index)}
                          className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Commentaire
                </label>
                <textarea
                  id="comment"
                  value={newIntervention.comment}
                  onChange={(e) => setNewIntervention({ ...newIntervention, comment: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ajoutez un commentaire sur l'intervention..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                  Options
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newIntervention.isPlusValue}
                      onChange={(e) => setNewIntervention({ ...newIntervention, isPlusValue: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Plus-value</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newIntervention.isSuivi}
                      onChange={(e) => setNewIntervention({ ...newIntervention, isSuivi: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Suivi</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Photos (max 2)
                </label>
                <div className="mt-1 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedPhotos.length >= 2}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Ajouter une photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>

                {previewUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    {previewUrls.map((url, index) => (
                      <div key={url} className="relative">
                        <img
                          src={url}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(selectedTypes.length > 0 || selectedConsumables.length > 0) && (
              <button
                type="submit"
                disabled={isSubmitting || (selectedTypes.length === 0 && selectedConsumables.length === 0)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Enregistrer l'intervention
                  </>
                )}
              </button>
            )}
          </div>
        </form>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Référence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Articles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Consommables
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commentaire
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Prix Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Photos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInterventions.map((intervention) => (
                  <tr key={intervention.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {format(intervention.date, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.clientNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.selectedTypes?.map((type: any, index: number) => (
                        <div key={index}>
                          {type.name} ({type.price}€)
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.selectedConsumables?.map((consumable: any, index: number) => (
                        <div key={index}>
                          {consumable.name} ({consumable.price?.toFixed(2)}€)
                        </div>
                      )) || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {intervention.comment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {intervention.totalPrice} €
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {intervention.photos?.map((photo: string, index: number) => (
                          <a
                            key={index}
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Photo {index + 1}
                          </a>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {activeTab === 'all' ? (
                        <button
                          onClick={() => handleDelete(intervention.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemoveFromTab(intervention.id, activeTab)}
                          className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                          title={`Retirer de l'onglet ${activeTab === 'plus-value' ? 'Plus-value' : 'Suivi'}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredInterventions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {activeTab === 'all'
                        ? 'Aucune intervention enregistrée'
                        : activeTab === 'plus-value'
                        ? 'Aucune intervention en plus-value'
                        : 'Aucune intervention en suivi'
                      }
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