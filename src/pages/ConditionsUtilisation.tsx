import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Eye, Clock, Mail } from 'lucide-react';

export function ConditionsUtilisation() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700">
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
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'inscription
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Conditions d'utilisation
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Dernière mise à jour : 18 septembre 2024
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-8 space-y-8">
            
            {/* Section 1 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Objet et acceptation
                </h2>
              </div>
              <div className="ml-11 text-gray-700 dark:text-gray-300 space-y-3">
                <p>
                  Les présentes conditions d'utilisation régissent l'utilisation de la plateforme MadlinK, 
                  une application web destinée à la gestion d'interventions pour les techniciens fibre optique.
                </p>
                <p>
                  En créant un compte sur MadlinK, vous acceptez sans réserve les présentes conditions d'utilisation.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-bold">2</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Description du service
                </h2>
              </div>
              <div className="ml-11 text-gray-700 dark:text-gray-300 space-y-3">
                <p>
                  MadlinK est une plateforme SaaS qui permet aux techniciens fibre optique de :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Gérer leurs interventions avec photos et commentaires</li>
                  <li>Suivre leurs dépenses par catégorie</li>
                  <li>Générer des rapports détaillés</li>
                  <li>Créer des factures personnalisées</li>
                  <li>Contrôler leurs données avec les fichiers Excel</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Protection des données
                </h2>
              </div>
              <div className="ml-11 text-gray-700 dark:text-gray-300 space-y-3">
                <p>
                  Vos données personnelles et professionnelles sont protégées selon les normes RGPD :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Chiffrement de toutes les données sensibles</li>
                  <li>Accès sécurisé par authentification</li>
                  <li>Sauvegarde automatique et sécurisée</li>
                  <li>Aucun partage avec des tiers sans consentement</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Utilisation du service
                </h2>
              </div>
              <div className="ml-11 text-gray-700 dark:text-gray-300 space-y-3">
                <p>
                  L'utilisateur s'engage à :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Utiliser le service de manière légale et conforme</li>
                  <li>Ne pas partager ses identifiants de connexion</li>
                  <li>Maintenir la confidentialité de ses données clients</li>
                  <li>Signaler tout problème de sécurité</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Période d'essai et abonnement
                </h2>
              </div>
              <div className="ml-11 text-gray-700 dark:text-gray-300 space-y-3">
                <p>
                  <strong>Période d'essai :</strong> 2 mois gratuits pour tous les nouveaux utilisateurs.
                </p>
                <p>
                  <strong>Abonnement :</strong> Après la période d'essai, l'accès au service nécessite un abonnement payant.
                </p>
                <p>
                  <strong>Résiliation :</strong> Possible à tout moment. Les données sont conservées 30 jours après résiliation.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">6</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Responsabilité
                </h2>
              </div>
              <div className="ml-11 text-gray-700 dark:text-gray-300 space-y-3">
                <p>
                  MadlinK s'efforce de fournir un service de qualité mais ne peut garantir :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Une disponibilité 100% du service</li>
                  <li>L'absence totale de bugs ou dysfonctionnements</li>
                  <li>La compatibilité avec tous les navigateurs</li>
                </ul>
                <p>
                  L'utilisateur est responsable de la sauvegarde de ses données importantes.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-teal-600 dark:text-teal-400 font-bold">7</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Modifications des conditions
                </h2>
              </div>
              <div className="ml-11 text-gray-700 dark:text-gray-300 space-y-3">
                <p>
                  MadlinK se réserve le droit de modifier les présentes conditions d'utilisation à tout moment.
                  Les utilisateurs seront informés par email des modifications importantes.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Contact
                </h2>
              </div>
              <div className="ml-11 text-gray-700 dark:text-gray-300">
                <p>
                  Pour toute question concernant ces conditions d'utilisation, contactez-nous à :
                </p>
                <p className="mt-2 font-medium text-blue-600 dark:text-blue-400">
                  contact@madlink.fr
                </p>
              </div>
            </section>

          </div>
        </div>

        {/* Bouton retour */}
        <div className="mt-8 text-center">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'inscription
          </Link>
        </div>
      </div>
    </div>
  );
}