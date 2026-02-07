import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Account {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  isVisible?: boolean;
  userId: string;
  createdAt: Date;
}

interface AccountsState {
  accounts: Account[];
  currentAccountId: string | null;
  accountVersion: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchAccounts: (userId: string) => Promise<void>;
  createAccount: (userId: string, name: string, color: string) => Promise<void>;
  createDefaultAccountAndMigrate: (userId: string) => Promise<void>;
  migrateExistingData: (userId: string, accountId: string) => Promise<void>;
  updateAccount: (accountId: string, name: string, color: string) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  setCurrentAccount: (accountId: string) => void;
  getCurrentAccount: () => Account | null;
}

const ACCOUNT_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Orange
];

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],
      currentAccountId: null,
      accountVersion: 0,
      loading: false,
      error: null,

      fetchAccounts: async (userId: string) => {
        try {
          set({ loading: true, error: null });
          
          const accountsRef = collection(db, 'accounts');
          const q = query(accountsRef, where('userId', '==', userId));
          const querySnapshot = await getDocs(q);
          
          const accounts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            color: doc.data().color,
            isDefault: doc.data().isDefault || false,
            isVisible: doc.data().isVisible !== false,
            userId: doc.data().userId,
            createdAt: doc.data().createdAt?.toDate() || new Date()
          }));

          // Si aucun compte n'existe, créer automatiquement le compte principal et migrer les données
          if (accounts.length === 0) {
            await get().createDefaultAccountAndMigrate(userId);
            return; // La fonction createDefaultAccountAndMigrate va rappeler fetchAccounts
          }

          // Vérifier s'il y a plusieurs comptes principaux et corriger
          const defaultAccounts = accounts.filter(account => account.isDefault);
          if (defaultAccounts.length > 1) {
            // Garder le premier compte principal et retirer le statut des autres
            for (let i = 1; i < defaultAccounts.length; i++) {
              const accountRef = doc(db, 'accounts', defaultAccounts[i].id);
              await updateDoc(accountRef, { isDefault: false });
              // Mettre à jour localement
              accounts.find(a => a.id === defaultAccounts[i].id)!.isDefault = false;
            }
          }

          // Si aucun compte principal n'existe, faire du premier compte le principal
          if (defaultAccounts.length === 0 && accounts.length > 0) {
            const firstAccount = accounts[0];
            const accountRef = doc(db, 'accounts', firstAccount.id);
            await updateDoc(accountRef, { isDefault: true });
            firstAccount.isDefault = true;
          }

          // Trier les comptes (défaut en premier)
          accounts.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });

          set({ 
            accounts, 
            currentAccountId: get().currentAccountId || accounts[0]?.id || null,
            loading: false 
          });
        } catch (error) {
          console.error('Erreur lors de la récupération des comptes:', error);
          set({ error: 'Erreur lors de la récupération des comptes', loading: false });
        }
      },

      createDefaultAccountAndMigrate: async (userId: string) => {
        try {
          set({ loading: true, error: null });
          
          // Créer le compte principal
          const accountData = {
            name: 'Principal',
            color: ACCOUNT_COLORS[1], // Bleu
            isDefault: true,
            isVisible: true,
            userId,
            createdAt: serverTimestamp()
          };

          const docRef = await addDoc(collection(db, 'accounts'), accountData);
          
          // Migrer automatiquement les données existantes
          await get().migrateExistingData(userId, docRef.id);

          // Recharger les comptes
          await get().fetchAccounts(userId);
        } catch (error) {
          console.error('Erreur lors de la création du compte par défaut:', error);
          set({ error: 'Erreur lors de la création du compte par défaut', loading: false });
        }
      },

      migrateExistingData: async (userId: string, accountId: string) => {
        try {
          // Migrer les interventions existantes
          const interventionsRef = collection(db, 'interventions');
          const interventionsQuery = query(interventionsRef, where('userId', '==', userId));
          const interventionsSnapshot = await getDocs(interventionsQuery);
          
          const interventionUpdates = interventionsSnapshot.docs
            .filter(doc => !doc.data().accountId) // Seulement celles sans accountId
            .map(doc => updateDoc(doc.ref, { accountId }));
          
          // Migrer les types d'intervention existants
          const typesRef = collection(db, 'intervention_types');
          const typesQuery = query(typesRef, where('userId', '==', userId));
          const typesSnapshot = await getDocs(typesQuery);
          
          const typeUpdates = typesSnapshot.docs
            .filter(doc => !doc.data().accountId)
            .map(doc => updateDoc(doc.ref, { accountId }));
          
          // Migrer les consommables existants
          const consumablesRef = collection(db, 'consumables');
          const consumablesQuery = query(consumablesRef, where('userId', '==', userId));
          const consumablesSnapshot = await getDocs(consumablesQuery);
          
          const consumableUpdates = consumablesSnapshot.docs
            .filter(doc => !doc.data().accountId)
            .map(doc => updateDoc(doc.ref, { accountId }));
          
          // Migrer les dépenses existantes
          const expensesRef = collection(db, 'expenses');
          const expensesQuery = query(expensesRef, where('userId', '==', userId));
          const expensesSnapshot = await getDocs(expensesQuery);
          
          const expenseUpdates = expensesSnapshot.docs
            .filter(doc => !doc.data().accountId)
            .map(doc => updateDoc(doc.ref, { accountId }));
          
          // Exécuter toutes les mises à jour
          await Promise.all([
            ...interventionUpdates,
            ...typeUpdates,
            ...consumableUpdates,
            ...expenseUpdates
          ]);
          
          console.log('Migration des données existantes terminée');
        } catch (error) {
          console.error('Erreur lors de la migration des données:', error);
        }
      },
      createAccount: async (userId: string, name: string, color: string) => {
        try {
          set({ loading: true, error: null });
          
          const accountData = {
            name,
            color,
            isDefault: false, // Les nouveaux comptes ne sont jamais principaux par défaut
            isVisible: true,
            userId,
            createdAt: serverTimestamp()
          };

          const docRef = await addDoc(collection(db, 'accounts'), accountData);
          
          const newAccount: Account = {
            id: docRef.id,
            name,
            color,
            isDefault: false,
            isVisible: true,
            userId,
            createdAt: new Date()
          };


          set(state => ({
            accounts: [...state.accounts, newAccount],
            currentAccountId: newAccount.id,
            loading: false
          }));
        } catch (error) {
          console.error('Erreur lors de la création du compte:', error);
          set({ error: 'Erreur lors de la création du compte', loading: false });
        }
      },

      updateAccount: async (accountId: string, name: string, color: string) => {
        try {
          set({ loading: true, error: null });
          
          const accountRef = doc(db, 'accounts', accountId);
          await updateDoc(accountRef, {
            name,
            color,
            updatedAt: serverTimestamp()
          });

          set(state => ({
            accounts: state.accounts.map(account =>
              account.id === accountId
                ? { ...account, name, color }
                : account
            ),
            loading: false
          }));
        } catch (error) {
          console.error('Erreur lors de la mise à jour du compte:', error);
          set({ error: 'Erreur lors de la mise à jour du compte', loading: false });
        }
      },

      deleteAccount: async (accountId: string) => {
        try {
          set({ loading: true, error: null });
          
          const account = get().accounts.find(a => a.id === accountId);
          if (account?.isDefault) {
            throw new Error('Impossible de supprimer le compte principal');
          }

          // Supprimer le compte de Firestore
          await deleteDoc(doc(db, 'accounts', accountId));

          const remainingAccounts = get().accounts.filter(a => a.id !== accountId);
          const newCurrentAccountId = get().currentAccountId === accountId 
            ? remainingAccounts[0]?.id || null
            : get().currentAccountId;

          set({
            accounts: remainingAccounts,
            currentAccountId: newCurrentAccountId,
            loading: false
          });
        } catch (error) {
          console.error('Erreur lors de la suppression du compte:', error);
          set({ error: 'Erreur lors de la suppression du compte', loading: false });
        }
      },

      setCurrentAccount: (accountId: string) => {
        set(state => ({
          currentAccountId: accountId,
          accountVersion: state.accountVersion + 1
        }));
      },

      getCurrentAccount: () => {
        const { accounts, currentAccountId } = get();
        // Si aucun compte n'existe, retourner un compte virtuel pour que l'app fonctionne
        if (accounts.length === 0) {
          return {
            id: 'virtual',
            name: 'Principal',
            color: ACCOUNT_COLORS[0],
            isDefault: true,
            isVisible: false,
            userId: '',
            createdAt: new Date()
          };
        }
        return accounts.find(account => account.id === currentAccountId) || accounts[0] || null;
      }
    }),
    {
      name: 'accounts-storage',
      partialize: (state) => ({
        currentAccountId: state.currentAccountId
      })
    }
  )
);