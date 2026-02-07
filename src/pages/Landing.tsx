import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Activity, FileText, Receipt, Settings, Shield, Clock, Users, Smartphone, Star, FileInput as FileInvoice, Gift, Sparkles, FileSpreadsheet, Search, BarChart3, Zap, Award, TrendingUp, Eye, CheckSquare, User } from 'lucide-react';
import { generateStructuredData } from '../lib/seo';

export function Landing() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = generateStructuredData('organization');
    document.head.appendChild(script);

    const script2 = document.createElement('script');
    script2.type = 'application/ld+json';
    script2.text = generateStructuredData('softwareApplication');
    document.head.appendChild(script2);

    const script3 = document.createElement('script');
    script3.type = 'application/ld+json';
    script3.text = generateStructuredData('faqPage');
    document.head.appendChild(script3);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(script2);
      document.head.removeChild(script3);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <Link to="/" className="flex items-center">
              <img
                src="/logo madlink.png"
                alt="MadlinK Logo"
                className="h-10 w-auto"
              />
            </Link>
            <div className="flex items-center space-x-6">
             
              <Link
                to="/contact"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Nous contacter
              </Link>
              <Link
                to="/auth"
                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center"
                title="Se connecter"
              >
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/20">
        {/* Bannière d'offre spéciale */}
        <div className="bg-gradient-to-r from-red-600 to-red-600 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center gap-3 text-center">
              <Gift className="w-5 h-5 animate-bounce" />
              <span className="font-bold text-lg">OFFRE SPÉCIALE :</span>
              <span className="font-medium">3 mois gratuits pour tous les nouveaux utilisateurs !</span>
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Contenu principal */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Award className="w-4 h-4" />
                La solution pour les techniciens fibre
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Gérez vos interventions
                <span className="block text-blue-600 dark:text-blue-400">en toute simplicité</span>
              </h1>

              <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                La solution complète pour les professionnels.
                Suivez vos interventions, contrôlez vos données, créez vos factures et optimisez votre gestion.
              </p>
              
              {/* Stats rapides */}
              <div className="mt-8 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3 mois</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">3 mois gratuits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">100%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Sécurisé</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Support</div>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/auth?register=true"
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
                >
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#features"
                  className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 px-8 py-4 rounded-lg flex items-center justify-center gap-2 hover:border-blue-600 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all font-semibold"
                >
                  <Eye className="w-5 h-5" />
                  Découvrir les fonctionnalités
                </a>
              </div>
            </div>

            {/* Visuel/Dashboard mockup */}
            <div className="relative">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gradient-to-r from-blue-500 to-blue-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="h-16 bg-gradient-to-br from-green-400 to-green-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="h-16 bg-gradient-to-br from-purple-400 to-purple-500 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Éléments décoratifs */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Une suite complète d'outils professionnels
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Tout ce dont vous avez besoin pour gérer efficacement votre activité de technicien
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Suivi des interventions */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Suivi interventions multi-opérateurs</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Gérez facilement vos interventions avec photos et commentaires
              </p>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Suivie photos 
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Gestion multi-grilles
                </li>
              </ul>
            </div>

            {/* Recherche d'interventions */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                <Search className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Recherche d'interventions</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Trouvez instantanément vos interventions par numéro client. 
              </p>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Recherche instantanée
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Historique complet
                </li>
              </ul>
            </div>

              {/* Contrôle Excel */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-6">
                <FileSpreadsheet className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Verification d'intervention</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Comparez automatiquement vos interventions avec les récapitulatifs Excel de vos donneurs d'ordre. Détection des écarts et export des différences.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Comparaison des récap
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Exporter les différences
                </li>
              </ul>
            </div>

            {/* Création de factures */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-6">
                <FileInvoice className="w-7 h-7 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Factures et devis</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Créez et personnalisez vos factures avec logo et informations légales
              </p>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Export en PDF 
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Personnalisation complète
                </li>
              </ul>
            </div>

            {/* Gestion des dépenses */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-6">
                <Receipt className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Gestion dépenses par compte opérateur</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Suivez vos dépenses professionnelles par catégorie et par compte. Calculez votre rentabilité réelle par opérateur.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Catégorisation automatique
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Calcul de rentabilité
                </li>
              </ul>
            </div>

            {/* Rapports détaillés */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Rapports détaillés</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Analysez votre chiffre d'affaires par type d'intervention, par opérateur et par période. Graphiques détaillés et exports inclus.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Voir toutes les intervention par mois 
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Un rapport détaillé CA, total des dépenses
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Pourquoi plus de 100 techniciens nous font confiance ?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Des avantages concrets pour votre activité quotidienne
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">100% Sécurisé</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Vos données sont cryptées et sauvegardées selon les normes bancaires
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Gain de temps</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Économisez 2h par jour sur vos tâches administratives
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Support réactif</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Une équipe dédiée disponible 7j/7 pour vous accompagner
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Mobile-first</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Interface optimisée pour smartphone et tablette
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ils ont transformé leur activité avec MadlinK
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Découvrez les retours d'expérience de nos utilisateurs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "MadlinK a révolutionné ma façon de travailler. Fini les papiers et Excel, tout est centralisé et je vois mon CA en temps réel. Un vrai game-changer !"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">S</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Salah</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Technicien fibre optique</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "L'export PDF mensuel me fait gagner des heures ! Plus besoin de tout ressaisir, j'ai toutes mes interventions avec commentaires et photos. C'est parfait."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400 font-semibold">M</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Mehdi</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Technicien fibre optique</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "Interface super intuitive, support ultra-réactif. La fonction de contrôle Excel m'a déjà évité plusieurs erreurs de facturation. Je recommande à 100% !"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">B</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Brams</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Installateur indépendant</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Des tarifs transparents et abordables
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Choisissez la formule qui correspond à vos besoins
            </p>
            
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 rounded-full px-8 py-3 shadow-lg">
              <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-200 font-bold text-lg">
                Profitez de 3 mois d'essai gratuit sur tous nos plans !
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Plan Mensuel</h3>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">6€</span>
                  <span className="text-gray-500 dark:text-gray-400">/mois</span>
                  <span className="ml-2 text-lg text-gray-400 dark:text-gray-500 line-through">9,99€</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300">Parfait pour commencer</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">Toutes les fonctionnalités</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">Support 7j/7</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">Mises à jour incluses</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">3 mois d'essai gratuit</span>
                </li>
              </ul>
              
              <Link
                to="/auth?register=true"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                Commencer gratuitement
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Annual Plan */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-8 rounded-2xl shadow-sm border-2 border-blue-200 dark:border-blue-700 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Le plus populaire
                </span>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Plan Annuel</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">60€</span>
                  <span className="text-gray-500 dark:text-gray-400">/an</span>
                  <span className="ml-2 text-lg text-gray-400 dark:text-gray-500 line-through">115€</span>
                </div>
                <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-4">
                  Économisez 55€ par an
                </div>
                <p className="text-gray-600 dark:text-gray-300">Le meilleur rapport qualité-prix</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">Toutes les fonctionnalités</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">Support prioritaire</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">Nouvelles fonctionnalités en avant-première</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">3 mois d'essai gratuit</span>
                </li>
              </ul>
              
              <Link
                to="/auth?register=true"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                Commencer gratuitement
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Prêt à transformer votre activité ?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez plus de 100 techniciens qui ont déjà optimisé leur gestion avec MadlinK
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth?register=true"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg flex items-center justify-center gap-2"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-semibold"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center mb-4">
                <img
                  src="/logo madlink.png"
                  alt="MadlinK Logo"
                  className="h-10 w-auto"
                />
              </Link>
              <p className="text-gray-400 mb-4 max-w-md">
                La solution complète pour les professionnels de la fibre optique. 
                Gérez vos interventions, contrôlez vos données et optimisez votre rentabilité.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Entreprise</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/auth" className="hover:text-white transition-colors">Connexion</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MadlinK. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}