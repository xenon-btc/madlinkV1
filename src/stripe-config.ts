export const STRIPE_PRODUCTS = {
  MADLINK_FR: {
    id: 'prod_SApl1pX0RbGVDI',
    priceId: 'price_1RGU5cBNZAEn1KtmEQKD75jU',
    name: 'Madlink.fr',
    description: 'Abonnement annuel à Madlink.fr',
    mode: 'subscription' as const,
    price: 60.00,
    interval: 'year'
  },
  MADLINK: {
    id: 'prod_SApkMDTArheEq2',
    priceId: 'price_1RGU50BNZAEn1KtmeAovgyDQ',
    name: 'Madlink',
    description: 'Abonnement mensuel à Madlink',
    mode: 'subscription' as const,
    price: 6.00,
    interval: 'month'
  }
} as const;