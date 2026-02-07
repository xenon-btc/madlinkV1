import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppContent } from './AppContent';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { NotFound } from './pages/NotFound';
import { Dashboard } from './pages/Dashboard';
import { Interventions } from './pages/Interventions';
import { InterventionTypes } from './pages/InterventionTypes';
import { Consumables } from './pages/Consumables';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Contact } from './pages/Contact';
import { InterventionVerification } from './pages/InterventionVerification';
import { InterventionSearch } from './pages/InterventionSearch';
import { Invoice } from './pages/Invoice';
import { Reminders } from './pages/Reminders';
import { Subscription } from './pages/Subscription';
import { Subscription2 } from './pages/Subscription2';
import { Admin } from './pages/Admin';
import { ConditionsUtilisation } from './pages/ConditionsUtilisation';
import { EmailVerification } from './pages/EmailVerification';
import { InterventionUnitaire } from './pages/InterventionUnitaire';
import { InstallPrompt } from './components/InstallPrompt';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { useAuthStore } from './store/auth';
import { useSubscriptionStore } from './store/subscription';
import { useAccountsStore } from './store/accounts';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

// Liste des emails administrateurs
const ADMIN_EMAILS = [
  'contact@madlink.fr'
];

// Fonction pour vérifier si la période d'essai est expirée
const isTrialExpired = (createdAt: Date): boolean => {
  const now = new Date();
  const trialEndDate = new Date(createdAt);
  trialEndDate.setDate(trialEndDate.getDate() + 90); // 3 mois d'essai (90 jours)
  return now > trialEndDate;
};

export function App() {
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const { hasActiveSubscription, checkSubscriptionStatus } = useSubscriptionStore();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Vérification en arrière-plan sans bloquer l'UI
        checkSubscriptionStatus(user.uid);
        
        // Récupérer les informations utilisateur et charger ses comptes
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const createdAt = userData.createdAt?.toDate() || new Date();
            const hasUsedTrialFromDB = userData.hasUsedTrial || false;

            // Pour les anciens utilisateurs sans hasUsedTrial défini
            // Si le compte a plus de 60 jours et n'a pas d'abonnement actif
            // On considère que la période d'essai est terminée
            const accountAge = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const effectiveHasUsedTrial = hasUsedTrialFromDB || (accountAge > 90);

            setUserCreatedAt(createdAt);
            setHasUsedTrial(effectiveHasUsedTrial);
          }
          
          // Vérifier si l'utilisateur a des données existantes (interventions, dépenses, etc.)
          const interventionsRef = collection(db, 'interventions');
          const interventionsQuery = query(
            interventionsRef,
            where('userId', '==', user.uid),
            limit(1)
          );
          const interventionsSnapshot = await getDocs(interventionsQuery);
          
          const expensesRef = collection(db, 'expenses');
          const expensesQuery = query(
            expensesRef,
            where('userId', '==', user.uid),
            limit(1)
          );
          const expensesSnapshot = await getDocs(expensesQuery);
          
          const typesRef = collection(db, 'intervention_types');
          const typesQuery = query(
            typesRef,
            where('userId', '==', user.uid),
            limit(1)
          );
          const typesSnapshot = await getDocs(typesQuery);
          
          // Si l'utilisateur a au moins une intervention, dépense ou type d'intervention, il a des données existantes
          const hasData = !interventionsSnapshot.empty || !expensesSnapshot.empty || !typesSnapshot.empty;
          setHasExistingData(hasData);
          
          // Charger les comptes de l'utilisateur pour s'assurer qu'ils sont disponibles
          // Ceci est important pour les utilisateurs qui viennent de vérifier leur email
          const { fetchAccounts } = useAccountsStore.getState();
          await fetchAccounts(user.uid);

        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
        } finally {
          setIsUserDataLoaded(true);
        }
      } else {
        setIsUserDataLoaded(true);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, [setUser]);

  if (isAuthChecking || (user && !isUserDataLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Déterminer quelle page d'abonnement utiliser
  const getSubscriptionPage = () => {
    if (!user || !userCreatedAt) return "/subscription";
    
    // Si l'utilisateur a un abonnement actif, pas besoin de redirection
    if (hasActiveSubscription) return "/dashboard";
    
    // Si l'utilisateur a déjà utilisé sa période d'essai OU si la période d'essai est expirée
    if (hasUsedTrial || isTrialExpired(userCreatedAt)) {
      return "/subscription2";
    }
    
    // Sinon, rediriger vers la page d'abonnement normale (première fois)
    return "/subscription";
  };

  // Vérifier si l'utilisateur peut accéder au dashboard
  const canAccessDashboard = () => {
    if (!user) return false;

    // Si les données ne sont pas encore chargées, ne pas autoriser l'accès
    if (!isUserDataLoaded || !userCreatedAt) return false;

    // Pour les utilisateurs existants avec des données, permettre l'accès même sans vérification email
    // Pour les nouveaux utilisateurs, exiger la vérification email
    if (!user.emailVerified && !hasExistingData) return false;

    if (hasActiveSubscription || isAdmin) return true;

    // Si l'utilisateur a déjà utilisé sa période d'essai, il ne peut plus accéder
    if (hasUsedTrial) return false;

    // Sinon, vérifier si la période d'essai n'est pas expirée
    return !isTrialExpired(userCreatedAt);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/conditions-utilisation" element={<ConditionsUtilisation />} />
        <Route path="/email-verification" element={user ? <EmailVerification /> : <Navigate to="/auth" />} />
        <Route path="/subscription" element={user ? (canAccessDashboard() ? <Navigate to="/dashboard" /> : <Subscription />) : <Navigate to="/auth" />} />
        <Route path="/subscription2" element={user ? (canAccessDashboard() ? <Navigate to="/dashboard" /> : <Subscription2 />) : <Navigate to="/auth" />} />
        <Route 
          path="/dashboard" 
          element={
            user ? (
              !user.emailVerified && !hasExistingData ? (
                <Navigate to="/email-verification" />
              ) : canAccessDashboard() ? (
                <AppContent />
              ) : (
                <Navigate to={getSubscriptionPage()} />
              )
            ) : (
              <Navigate to="/auth" />
            )
          }
        >
          {/* Routes pour les utilisateurs normaux */}
          {!isAdmin && (
            <>
              <Route index element={<Dashboard />} />
              <Route path="interventions" element={<Interventions />} />
              <Route path="intervention-types" element={<InterventionTypes />} />
              <Route path="consumables" element={<Consumables />} />
              <Route path="intervention-search" element={<InterventionSearch />} />
              <Route path="intervention-verification" element={<InterventionVerification />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="reminders" element={<Reminders />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="contact" element={<Contact />} />
              <Route path="invoice" element={<Invoice />} />
              <Route path="intervention-unitaire" element={<InterventionUnitaire />} />
            </>
          )}
          
          {/* Routes pour les admins */}
          {isAdmin && (
            <>
              <Route index element={<Navigate to="/dashboard/admin" />} />
              <Route path="admin" element={<Admin />} />
              <Route path="settings" element={<Settings />} />
            </>
          )}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <InstallPrompt />
    </Router>
  );
}