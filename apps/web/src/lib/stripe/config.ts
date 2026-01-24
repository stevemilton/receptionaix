import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// For backwards compatibility - use getStripe() instead
export const stripe = {
  get customers() { return getStripe().customers; },
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
};

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string; // Stripe Price ID
  features: string[];
  limits: {
    callsPerMonth: number;
    knowledgeBaseSize: number;
    supportLevel: 'email' | 'priority' | 'dedicated';
  };
  popular?: boolean;
}

// Pricing tiers - Price IDs should be set via environment variables
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small businesses just getting started',
    price: 29,
    priceId: process.env.STRIPE_PRICE_STARTER || 'price_starter',
    features: [
      'Up to 100 calls/month',
      'Basic AI receptionist',
      'Email support',
      'Standard voice quality',
      'Business hours only',
    ],
    limits: {
      callsPerMonth: 100,
      knowledgeBaseSize: 10,
      supportLevel: 'email',
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses that need more capacity',
    price: 79,
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
    features: [
      'Up to 500 calls/month',
      'Advanced AI with custom training',
      'Priority email support',
      'HD voice quality',
      '24/7 availability',
      'Google Calendar integration',
      'Custom greeting message',
    ],
    limits: {
      callsPerMonth: 500,
      knowledgeBaseSize: 50,
      supportLevel: 'priority',
    },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For high-volume businesses with premium needs',
    price: 199,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    features: [
      'Unlimited calls',
      'Premium AI with advanced features',
      'Dedicated account manager',
      'Premium HD voice',
      '24/7 availability',
      'All integrations included',
      'Custom AI personality',
      'Multi-location support',
      'API access',
      'White-label option',
    ],
    limits: {
      callsPerMonth: -1, // unlimited
      knowledgeBaseSize: -1, // unlimited
      supportLevel: 'dedicated',
    },
  },
];

export function getTierById(tierId: string): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.id === tierId);
}

export function getTierByPriceId(priceId: string): PricingTier | undefined {
  return PRICING_TIERS.find((tier) => tier.priceId === priceId);
}
