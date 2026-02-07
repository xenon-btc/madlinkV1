import React, { useState } from 'react';
import { Moon, Sun, Eye, EyeOff, Loader2, Mail, AlertTriangle, CheckCircle2, UserX, Trash2, Calendar, Clock, Gift } from 'lucide-react';
import { useThemeStore } from '../store/theme';
import { useAuthStore } from '../store/auth';
import { useSubscriptionStore } from '../store/subscription';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch, getDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { differenceInDays, addDays } from 'date-fns';
import { addMonths } from 'date-fns';

export function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { user, changePassword, error, loading, sendVerificationEmail } = useAuthStore();
  const navigate = useNavigate();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const { hasActiveSubscription } = useSubscriptionStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [unsubscribeLoading, setUnsubscribeLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [trialInfo, setTrialInfo] = useState<{
    daysRemaining: number;
    hasUsedTrial: boolean;
    createdAt: Date | null;
  }>({
    daysRemaining: 0,
    hasUsedTrial: false,
    createdAt: null
  });

  // Fonction pour calculer les jours restants
  const calculateTrialDays = (createdAt: Date, hasUsedTrial: boolean) => {
    if (hasUsedTrial) return 0;
    
    const trialEndDate = addDays(createdAt, 90); // 3 mois d'essai (90 jours)
    const today = new Date();
    const daysRemaining = Math.ceil(differenceInDays(trialEndDate, today));
    
    return Math.max(0, daysRemaining);
  };

  // Récupérer les informations d'essai au chargement
  React.useEffect(() => {
    const fetchTrialInfo = async () => {
      if (!user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const createdAt = userData.createdAt?.toDate() || new Date();
          
          // Pour les anciens utilisateurs, vérifier s'ils peuvent encore bénéficier de l'essai
          const accountAge = differenceInDays(new Date(), createdAt);
          const hasUsedTrialFromDB = userData.hasUsedTrial || false;
          const effectiveHasUsedTrial = hasUsedTrialFromDB || (accountAge > 90 && !hasActiveSubscription);
          
          const daysRemaining = calculateTrialDays(createdAt, effectiveHasUsedTrial);

          setTrialInfo({
            daysRemaining,
            hasUsedTrial: effectiveHasUsedTrial,
            createdAt
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des informations d\'essai:', error);
      }
    };

    fetchTrialInfo();
  }, [user]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
    }
  };

  const handleVerifyEmail = async () => {
    await sendVerificationEmail();
  };

  const handleUnsubscribe = async () => {
    if (!user || confirmationText !== 'SUPPRIMER') return;

    try {
      setUnsubscribeLoading(true);

      // Supprimer toutes les données de l'utilisateur
      const collections = ['interventions', 'expenses', 'intervention_types'];
      const batch = writeBatch(db);

      for (const collectionName of collections) {
        const q = query(
          collection(db, collectionName),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        querySnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      // Supprimer le document utilisateur
      batch.delete(doc(db, 'users', user.uid));

      // Exécuter toutes les suppressions
      await batch.commit();

      // Supprimer le compte utilisateur
      await deleteUser(user);

      // Rediriger vers la page d'accueil
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      alert('Une erreur est survenue lors de la suppression du compte. Veuillez réessayer.');
    } finally {
      setUnsubscribeLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
      
      {/* Section période d'essai - uniquement pour les utilisateurs non payants */}
      {user && !hasActiveSubscription && !trialInfo.hasUsedTrial && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Gift className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Période d'essai gratuite
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-800 dark:text-blue-200">
                    <span className="font-bold text-2xl">{trialInfo.daysRemaining}</span> jour{trialInfo.daysRemaining > 1 ? 's' : ''} restant{trialInfo.daysRemaining > 1 ? 's' : ''} (3 mois gratuits)
                  </span>
                </div>
                
                {trialInfo.daysRemaining > 0 ? (
                  <div className="bg-white dark:bg-blue-800/30 rounded-lg p-4">
                    <p className="text-blue-700 dark:text-blue-200 text-sm">
                      🎉 Profitez de 3 mois gratuits ! Il vous reste encore <strong>{trialInfo.daysRemaining} jour{trialInfo.daysRemaining > 1 ? 's' : ''}</strong> !
                    </p>
                    <p className="text-blue-600 dark:text-blue-300 text-xs mt-2">
                      Après cette période, vous pourrez choisir un abonnement pour continuer à utiliser MadlinK.
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                    <p className="text-orange-800 dark:text-orange-200 text-sm font-medium">
                      ⏰ Votre période d'essai de 3 mois est terminée
                    </p>
                    <p className="text-orange-700 dark:text-orange-300 text-xs mt-1">
                      Choisissez un abonnement pour continuer à utiliser toutes les fonctionnalités.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section utilisateurs payants */}
      {user && hasActiveSubscription && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-1">
                Abonnement actif
              </h2>
              <p className="text-green-700 dark:text-green-200 text-sm">
                Merci de faire confiance à MadlinK ! Vous avez accès à toutes les fonctionnalités.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDarkMode ? <Moon className="w-5 h-5 text-gray-700 dark:text-gray-200" /> : <Sun className="w-5 h-5 text-gray-700 dark:text-gray-200" />}
            <span className="text-gray-700 dark:text-gray-200">Mode sombre</span>
          </div>
          <button
            onClick={toggleDarkMode}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700"
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adresse email</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.emailVerified ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                Email vérifié
              </span>
            ) : (
              <button
                onClick={handleVerifyEmail}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
                Vérifier l'email
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Changer le mot de passe</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
            Mot de passe modifié avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white pr-10 ${
                  confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || newPassword !== confirmPassword}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Modification en cours...
              </>
            ) : (
              'Modifier le mot de passe'
            )}
          </button>
        </form>
      </div>

      {/* Section de désabonnement */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-4">
          <UserX className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">A lire attentivement</h2>
            <p className="text-red-700 dark:text-red-300 mb-4">
              La résiliation de votre compte est irréversible. Toutes vos données seront définitivement perdues :
            </p>
            <ul className="list-disc list-inside text-red-700 dark:text-red-300 mb-6 space-y-1">
              <li>Toutes vos interventions</li>
              <li>Tous vos articles</li>
              <li>Toutes vos dépenses</li>
              <li>Tous vos rapports et historiques</li>
              <li>Votre compte utilisateur</li>
            </ul>
            <button
              onClick={() => setShowUnsubscribeModal(true)}
              className="bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
               Résilier mon abonnement 
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmation de désabonnement */}
      {showUnsubscribeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirmer la suppression
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ⏰ Votre période d'essai de 2 mois est terminée
                </p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-800 dark:text-red-200 text-sm font-medium mb-2">
                ⚠️ Attention : Toutes vos données seront définitivement supprimées
              </p>
              <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                <li>• Interventions et photos</li>
                <li>• Dépenses et rapports</li>
                <li>• Types d'interventions personnalisés</li>
                <li>• Compte utilisateur</li>
              </ul>
            </div>

            <div className="mb-6">
              <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Pour confirmer, tapez <span className="font-bold text-red-600 dark:text-red-400">SUPPRIMER</span> ci-dessous :
              </label>
              <input
                type="text"
                id="confirmText"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                placeholder="Tapez SUPPRIMER"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnsubscribeModal(false);
                  setConfirmationText('');
                }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                disabled={unsubscribeLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleUnsubscribe}
                disabled={confirmationText !== 'SUPPRIMER' || unsubscribeLoading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {unsubscribeLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Supprimer définitivement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}