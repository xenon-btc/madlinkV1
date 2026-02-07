import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { redirectToStripeCheckout } from '../lib/stripe';

const PLANS = [
  {
    name: 'Abonnement Mensuel',
    price: '6',
    oldPrice: '10',
    interval: 'mois',
    type: 'MONTHLY' as const,
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
    type: 'YEARLY' as const,
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

export function Subscription() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleSubscribe = async (planType: 'MONTHLY' | 'YEARLY') => {
    try {
      setLoading(true);
      await redirectToStripeCheckout(planType);
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
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Choisissez votre formule
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            Des tarifs simples et transparents pour tous vos besoins
          </p>
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              🎉 Offre spéciale : 3 mois gratuits pour tous les nouveaux utilisateurs !
            </p>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
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
                    ✨ Inclus : 3 mois d'essai gratuit
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
                  onClick={() => handleSubscribe(plan.type)}
                  disabled={loading}
                  className="mt-8 w-full bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    <>
                      Choisir cette formule
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Paiement sécurisé • Annulation à tout moment • 3 mois d'essai gratuit
          </p>
        </div>
      </div>
    </div>
  );
}