import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/auth';

const PLANS = [
  {
    name: 'Abonnement Mensuel',
    price: '6',
    oldPrice: '10',
    interval: 'mois',
    stripeUrl: 'https://buy.stripe.com/aFaaEW53O0rc6k26hgcwg04',
    features: [
      'Nombre illimité d\'interventions',
      'Gestion des dépenses',
      'Rapports détaillés',
      'Annulation à tout moment'
    ],
    discount: 40
  },
  {
    name: 'Abonnement Annuel',
    price: '60',
    oldPrice: '120',
    interval: 'an',
    stripeUrl: 'https://buy.stripe.com/cNi6oG8g04HsfUCfRQcwg05',
    features: [
      'Nombre illimité d\'interventions',
      'Économisez 50% sur l\'année',
      'Gestion des dépenses',
      'Rapports détaillés',
      'Annulation à tout moment'
    ],
    discount: 50
  }
];

export function Subscription2() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleSubscribe = async (stripeUrl: string) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const url = new URL(stripeUrl);
      url.searchParams.append('client_reference_id', user.uid);
      if (user.email) {
        url.searchParams.append('prefilled_email', user.email);
      }
      
      // Update success and cancel URLs to include the full domain
      const baseUrl = window.location.origin;
      url.searchParams.append('success_url', `${baseUrl}/dashboard`);
      url.searchParams.append('cancel_url', `${baseUrl}/subscription2`);
      
      window.location.href = url.toString();
    } catch (error) {
      console.error('Error redirecting to Stripe:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <Link to="/" className="flex items-center">
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-200">
                Mad<span className="text-blue-600 dark:text-blue-400">lin</span>K
              </h1>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/auth"
                className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
              >
                Connexion
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Alerte période d'essai expirée */}
        <div className="mb-8 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 max-w-4xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
                Votre période d'essai de 3 mois est terminée
              </h3>
              <p className="text-orange-700 dark:text-orange-300">
                Pour continuer à utiliser MadlinK et accéder à toutes vos données, veuillez choisir un abonnement ci-dessous. 
                Vos interventions, dépenses et rapports vous attendent !
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Continuez avec MadlinK
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Choisissez votre formule pour retrouver l'accès à votre espace de travail
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-700 transition-all"
            >
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                    -{plan.discount}% de réduction
                  </div>
                </div>

                <div className="mt-6 flex items-baseline">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    {plan.price}€
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    /{plan.interval}
                  </span>
                  <span className="ml-4 text-lg text-gray-400 dark:text-gray-500 line-through">
                    {plan.oldPrice}€
                  </span>
                </div>

                <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                    ✨ Accès immédiat à toutes vos données
                  </p>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-gray-600 dark:text-gray-300">
                      <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.stripeUrl)}
                  disabled={loading}
                  className="mt-8 w-full bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    <>
                      Reprendre mon activité
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="font-medium text-gray-900 dark:text-white">Important</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Vos données sont conservées en sécurité. Dès votre abonnement activé, 
              vous retrouverez immédiatement l'accès à toutes vos interventions, dépenses et rapports.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Paiement sécurisé • Annulation à tout moment • Support client réactif
          </p>
        </div>
      </div>
    </div>
  );
}