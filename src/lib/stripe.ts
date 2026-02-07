import { auth } from './firebase';

const STRIPE_URLS = {
  MONTHLY: 'https://buy.stripe.com/00gdSigZDgL17aU146',
  YEARLY: 'https://buy.stripe.com/8wMbKa24JamDbra145'
} as const;

export async function redirectToStripeCheckout(plan: keyof typeof STRIPE_URLS) {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    const checkoutUrl = new URL(STRIPE_URLS[plan]);
    checkoutUrl.searchParams.append('client_reference_id', auth.currentUser.uid);
    if (auth.currentUser.email) {
      checkoutUrl.searchParams.append('prefilled_email', auth.currentUser.email);
    }
    
    // Update success and cancel URLs to include the full domain
    const baseUrl = window.location.origin;
    checkoutUrl.searchParams.append('success_url', `${baseUrl}/dashboard`);
    checkoutUrl.searchParams.append('cancel_url', `${baseUrl}/subscription`);
    
    window.location.href = checkoutUrl.toString();
  } catch (error) {
    console.error('Error redirecting to Stripe:', error);
    throw error;
  }
}