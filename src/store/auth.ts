import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  sendPasswordResetEmail,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
}

const initialState = {
  user: null,
  loading: true,
  error: null
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true, error: null });
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          set({ user: userCredential.user, loading: false });
        } catch (error) {
          let errorMessage = 'Email ou mot de passe incorrect';
          set({ error: errorMessage, loading: false });
        }
      },
      signUp: async (email: string, password: string, firstName: string, lastName: string, phone: string) => {
        try {
          set({ loading: true, error: null });
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          await updateProfile(userCredential.user, {
            displayName: `${firstName} ${lastName}`
          });

          await setDoc(doc(db, 'users', userCredential.user.uid), {
            firstName,
            lastName,
            phone,
            email,
            payment_status: 'unpaid',
            hasUsedTrial: false, // Nouveau champ pour tracker l'utilisation de l'essai
            createdAt: new Date()
          });

          // Envoyer automatiquement l'email de vérification
          await sendEmailVerification(userCredential.user);

          set({ 
            user: userCredential.user,
            loading: false
          });
        } catch (error) {
          let errorMessage = 'Une erreur est survenue lors de l\'inscription';
          if ((error as Error).message.includes('email-already-in-use')) {
            errorMessage = 'Un compte existe déjà avec cet email';
          }
          set({ error: errorMessage, loading: false });
        }
      },
      signOut: async () => {
        try {
          await firebaseSignOut(auth);
          set({ user: null, error: null });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      setUser: (user) => set({ user, loading: false }),
      setError: (error) => set({ error }),
      changePassword: async (currentPassword: string, newPassword: string) => {
        try {
          set({ loading: true, error: null });
          const user = auth.currentUser;
          
          if (!user || !user.email) {
            throw new Error('Utilisateur non connecté');
          }

          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(user, credential);
          await updatePassword(user, newPassword);
          
          set({ loading: false });
        } catch (error) {
          let errorMessage = 'Une erreur est survenue';
          if ((error as Error).message.includes('wrong-password')) {
            errorMessage = 'Mot de passe actuel incorrect';
          }
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },
      resetPassword: async (email: string) => {
        try {
          set({ loading: true, error: null });
          await sendPasswordResetEmail(auth, email);
          set({ 
            loading: false, 
            error: 'Un email de réinitialisation du mot de passe vous a été envoyé.'
          });
        } catch (error) {
          let errorMessage = 'Une erreur est survenue';
          if ((error as Error).message.includes('user-not-found')) {
            errorMessage = 'Aucun compte trouvé avec cet email';
          }
          set({ error: errorMessage, loading: false });
        }
      },
      sendVerificationEmail: async () => {
        try {
          set({ loading: true, error: null });
          const user = auth.currentUser;
          if (!user) throw new Error('Utilisateur non connecté');
          
          await sendEmailVerification(user);
          set({ 
            loading: false,
            error: 'Un email de vérification vous a été envoyé.'
          });
        } catch (error) {
          set({ 
            error: 'Erreur lors de l\'envoi de l\'email de vérification. Veuillez réessayer plus tard.',
            loading: false 
          });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch (error) {
          console.error('Storage error:', error);
          return {
            getItem: () => JSON.stringify(initialState),
            setItem: () => {},
            removeItem: () => {}
          };
        }
      })
    }
  )
);