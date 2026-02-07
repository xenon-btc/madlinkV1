export const seoConfig = {
  siteName: 'MadlinK',
  siteUrl: 'https://madlink.fr',
  defaultTitle: 'MadlinK - Gestion d\'interventions fibre optique pour techniciens | Multi-comptes & CA mensuel',
  defaultDescription: 'Solution complète pour techniciens fibre optique. Gérez vos comptes opérateurs (Orange, SFR, Bouygues), suivez votre CA mensuel, créez factures et devis. Essai gratuit 3 mois.',
  twitterHandle: '@madlink_fr',

  pages: {
    home: {
      title: 'MadlinK - Gestion d\'interventions fibre optique pour techniciens | Multi-comptes & CA mensuel',
      description: 'Solution complète pour techniciens fibre optique. Gérez vos comptes opérateurs (Orange, SFR, Bouygues), suivez votre CA mensuel, créez factures et devis. Essai gratuit 3 mois.',
      keywords: 'gestion interventions fibre optique, technicien fibre, opérateur internet, multi-comptes, CA mensuel, suivi interventions, facturation technicien, Orange, SFR, Bouygues, Free',
      canonical: 'https://madlink.fr'
    },
    dashboard: {
      title: 'Tableau de bord - Suivi CA et interventions fibre optique | MadlinK',
      description: 'Suivez en temps réel votre chiffre d\'affaires par opérateur, vos interventions mensuelles et vos dépenses. Tableau de bord complet pour techniciens fibre.',
      keywords: 'tableau de bord technicien, CA mensuel, suivi interventions, statistiques fibre optique, multi-opérateurs',
      canonical: 'https://madlink.fr/dashboard'
    },
    interventions: {
      title: 'Gestion des interventions fibre optique | Multi-opérateurs | MadlinK',
      description: 'Gérez facilement vos interventions avec photos et commentaires. Compatible Orange, SFR, Bouygues, Free. Export PDF et Excel inclus.',
      keywords: 'interventions fibre optique, gestion multi-opérateurs, suivi chantier, photos interventions, export PDF',
      canonical: 'https://madlink.fr/dashboard/interventions'
    },
    expenses: {
      title: 'Gestion des dépenses professionnelles | Technicien fibre | MadlinK',
      description: 'Suivez et catégorisez vos dépenses professionnelles. Calculez votre rentabilité par compte opérateur. Export comptable simplifié.',
      keywords: 'dépenses technicien, comptabilité fibre optique, gestion dépenses, rentabilité interventions',
      canonical: 'https://madlink.fr/dashboard/expenses'
    },
    reports: {
      title: 'Rapports et analyses CA par opérateur | Technicien fibre | MadlinK',
      description: 'Rapports détaillés de votre activité : CA par type d\'intervention, par opérateur, évolution mensuelle. Graphiques et exports inclus.',
      keywords: 'rapport CA fibre optique, analyse interventions, statistiques par opérateur, graphiques CA',
      canonical: 'https://madlink.fr/dashboard/reports'
    },
    invoice: {
      title: 'Création de factures et devis pour technicien fibre | MadlinK',
      description: 'Créez et personnalisez vos factures et devis avec logo. Export PDF professionnel. Historique de facturation complet.',
      keywords: 'facture technicien fibre, devis interventions, facturation professionnelle, export PDF facture',
      canonical: 'https://madlink.fr/dashboard/invoice'
    },
    contact: {
      title: 'Contact et support technique | MadlinK',
      description: 'Contactez notre équipe support 7j/7. Assistance technique, questions commerciales, demandes de fonctionnalités.',
      keywords: 'contact MadlinK, support technique, assistance technicien',
      canonical: 'https://madlink.fr/contact'
    },
    subscription: {
      title: 'Tarifs et abonnements - 2 mois gratuits | MadlinK',
      description: 'Plans mensuels et annuels pour techniciens fibre. 6€/mois ou 60€/an. Toutes les fonctionnalités incluses. 3 mois d\'essai gratuit.',
      keywords: 'tarifs technicien fibre, abonnement logiciel, prix gestion interventions, essai gratuit',
      canonical: 'https://madlink.fr/subscription'
    }
  },

  structuredData: {
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'MadlinK',
      url: 'https://madlink.fr',
      logo: 'https://madlink.fr/icon-512.png',
      description: 'Solution de gestion d\'interventions fibre optique pour techniciens indépendants et entreprises',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: 'French',
        areaServed: 'FR'
      },
      sameAs: []
    },

    softwareApplication: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'MadlinK',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: {
        '@type': 'Offer',
        price: '6.00',
        priceCurrency: 'EUR',
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/InStock',
        url: 'https://madlink.fr/subscription'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '100',
        bestRating: '5',
        worstRating: '1'
      },
      description: 'Application de gestion d\'interventions fibre optique pour techniciens. Gestion multi-comptes opérateurs, suivi CA mensuel, création de factures.',
      screenshot: 'https://madlink.fr/screenshot.png',
      featureList: [
        'Gestion multi-comptes opérateurs (Orange, SFR, Bouygues, Free)',
        'Suivi du chiffre d\'affaires mensuel',
        'Création de factures et devis',
        'Export PDF et Excel',
        'Rapports détaillés par type d\'intervention',
        'Gestion des dépenses',
        'Recherche d\'interventions',
        'Vérification automatique des fichiers Excel',
        'Photos et commentaires sur interventions'
      ]
    },

    localBusiness: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'MadlinK',
      image: 'https://madlink.fr/icon-512.png',
      '@id': 'https://madlink.fr',
      url: 'https://madlink.fr',
      priceRange: '€€',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'FR',
        addressRegion: 'France'
      },
      geo: {
        '@type': 'GeoCoordinates',
        addressCountry: 'FR'
      },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday'
        ],
        opens: '00:00',
        closes: '23:59'
      }
    },

    faqPage: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Comment fonctionne la gestion multi-comptes sur MadlinK ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'MadlinK permet de gérer plusieurs comptes opérateurs simultanément (Orange, SFR, Bouygues, Free). Vous pouvez suivre vos interventions et votre CA pour chaque compte séparément, avec des tableaux de bord dédiés.'
          }
        },
        {
          '@type': 'Question',
          name: 'Puis-je créer des factures professionnelles avec MadlinK ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui, MadlinK inclut un module de création de factures et devis personnalisables avec votre logo. Export PDF professionnel inclus pour envoi à vos clients.'
          }
        },
        {
          '@type': 'Question',
          name: 'Combien coûte l\'abonnement MadlinK ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'MadlinK propose deux formules : 6€/mois en mensuel ou 60€/an en annuel (économisez 12€). Les deux offres incluent 3 mois d\'essai gratuit et toutes les fonctionnalités.'
          }
        },
        {
          '@type': 'Question',
          name: 'MadlinK est-il compatible avec les fichiers Excel des opérateurs ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui, MadlinK peut vérifier automatiquement vos interventions avec les fichiers Excel fournis par vos donneurs d\'ordre. La fonction de comparaison détecte les écarts et vous permet d\'exporter les différences.'
          }
        },
        {
          '@type': 'Question',
          name: 'Puis-je suivre mon CA en temps réel ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Oui, le tableau de bord MadlinK affiche en temps réel votre CA du jour, de la semaine, du mois et total. Vous pouvez également voir le CA par opérateur et par type d\'intervention avec des graphiques détaillés.'
          }
        }
      ]
    }
  }
};

export function generateStructuredData(type: keyof typeof seoConfig.structuredData) {
  return JSON.stringify(seoConfig.structuredData[type]);
}

export function getPageMeta(page: keyof typeof seoConfig.pages) {
  return seoConfig.pages[page];
}
