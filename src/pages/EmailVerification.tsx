import React, { useState, useRef, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle2, AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAccountsStore } from '../store/accounts';

export function EmailVerification() {
  const { user, sendVerificationEmail, signOut, error, loading } = useAuthStore();
  const { fetchAccounts } = useAccountsStore();
  const [emailSent, setEmailSent] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [checkingMessage, setCheckingMessage] = useState('');
  const navigate = useNavigate();

  // Vérifier si l'email a été vérifié
  useEffect(() => {
    // Écouter les changements d'état d'authentification
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.emailVerified) {
        // Recharger les comptes de l'utilisateur pour s'assurer qu'ils sont disponibles
        try {
          await fetchAccounts(user.uid);
          // Rediriger vers le dashboard
          navigate('/dashboard');
        } catch (error) {
          console.error('Erreur lors du rechargement des comptes:', error);
          // Rediriger quand même vers le dashboard
          navigate('/dashboard');
        }
      }
    });

    return () => unsubscribe();
  }, [user, navigate, fetchAccounts]);

  const handleSendVerification = async () => {
    try {
      await sendVerificationEmail();
      setEmailSent(true);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;

    try {
      setIsCheckingVerification(true);
      setCheckingMessage('Vérification en cours...');
      
      // Recharger les données utilisateur depuis Firebase
      await user.reload();
      
      if (user.emailVerified) {
        setCheckingMessage('Email vérifié ! Redirection...');
        
        // Recharger les comptes avant de rediriger
        try {
          await fetchAccounts(user.uid);
          // Attendre un peu pour que l'utilisateur voie le message
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        } catch (error) {
          console.error('Erreur lors du rechargement des comptes:', error);
          // Rediriger quand même
          navigate('/dashboard');
        }
      } else {
        setCheckingMessage('Email non encore vérifié. Vérifiez votre boîte mail.');
        setTimeout(() => {
          setIsCheckingVerification(false);
          setCheckingMessage('');
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      setCheckingMessage('Erreur lors de la vérification.');
      setTimeout(() => {
        setIsCheckingVerification(false);
        setCheckingMessage('');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Vérifiez votre email
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pour accéder à MadlinK, vous devez d'abord vérifier votre adresse email
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
          {/* Email de l'utilisateur */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Email à vérifier :
            </p>
            <p className="text-lg font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg">
              {user?.email}
            </p>
          </div>

          {/* Messages d'état */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {emailSent && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">Email envoyé !</p>
                <p>Vérifiez votre boîte mail (et vos spams) puis cliquez sur le lien de vérification.</p>
              </div>
            </div>
          )}

          {/* Message de vérification en cours */}
          {checkingMessage && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-start gap-2">
              <Loader2 className="w-5 h-5 animate-spin mt-0.5 flex-shrink-0" />
              <p>{checkingMessage}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Instructions :
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Vérifiez votre boîte mail (et le dossier spam)</li>
              <li>Cliquez sur le lien de vérification dans l'email</li>
              <li>Revenez sur cette page</li>
              <li>L'accès sera automatiquement débloqué</li>
            </ol>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-3">
            <button
              onClick={handleSendVerification}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  {emailSent ? 'Renvoyer l\'email' : 'Envoyer l\'email de vérification'}
                </>
              )}
            </button>

            <button
              onClick={handleCheckVerification}
              disabled={isCheckingVerification}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {isCheckingVerification ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {checkingMessage || 'Vérification...'}
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  J'ai vérifié mon email
                </>
              )}
            </button>
          </div>

          {/* Bouton de déconnexion */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Note de sécurité */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cette vérification garantit la sécurité de votre compte et vous permet de récupérer l'accès en cas d'oubli de mot de passe.
          </p>
        </div>
      </div>
    </div>
  );
}