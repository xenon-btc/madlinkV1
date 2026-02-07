import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SubscriptionState {
  hasActiveSubscription: boolean;
  loading: boolean;
  error: string | null;
  checkSubscriptionStatus: (userId: string) => Promise<void>;
  setSubscriptionStatus: (status: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      hasActiveSubscription: false,
      loading: false,
      error: null,
      checkSubscriptionStatus: async (userId: string) => {
        try {
          set({ loading: true, error: null });
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const hasActiveSubscription = userDoc.data().payment_status === 'paid';
            set({ hasActiveSubscription, loading: false });
          } else {
            set({ hasActiveSubscription: false, loading: false });
          }
        } catch (error) {
          set({ 
            error: (error as Error).message,
            loading: false,
            hasActiveSubscription: false
          });
        }
      },
      setSubscriptionStatus: (status: boolean) => {
        set({ hasActiveSubscription: status });
      }
    }),
    {
      name: 'subscription-storage',
      storage: localStorage
    }
  )
);