/**
 * Client-safe pricing data.
 * This file contains pricing tier information WITHOUT Stripe Price IDs or secrets.
 * Import this in client components instead of config.ts.
 */

export interface ClientPricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  limits: {
    callsPerMonth: number;
    minutesPerMonth: number;
    knowledgeBaseSize: number;
    supportLevel: 'email' | 'priority' | 'dedicated';
  };
  popular?: boolean;
  overageRate?: number;
}

export const CLIENT_PRICING_TIERS: ClientPricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Up to 20 calls a week',
    price: 49,
    features: [
      '80 calls/month (~200 minutes)',
      'AI receptionist with your knowledge base',
      'Email support',
      'Standard voice quality',
      'Business hours configuration',
      'Call forwarding when limits reached',
    ],
    limits: {
      callsPerMonth: 80,
      minutesPerMonth: 200,
      knowledgeBaseSize: 10,
      supportLevel: 'email',
    },
    overageRate: 0.50,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Up to 100 calls a week',
    price: 149,
    features: [
      '400 calls/month (~1,000 minutes)',
      'Advanced AI with custom training',
      'Priority email support',
      'HD voice quality',
      '24/7 availability',
      'Google Calendar integration',
      'Custom greeting message',
      'Call forwarding when limits reached',
    ],
    limits: {
      callsPerMonth: 400,
      minutesPerMonth: 1000,
      knowledgeBaseSize: 50,
      supportLevel: 'priority',
    },
    popular: true,
    overageRate: 0.50,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited support for high-volume businesses',
    price: 399,
    features: [
      'Unlimited calls and minutes',
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
      callsPerMonth: -1,
      minutesPerMonth: -1,
      knowledgeBaseSize: -1,
      supportLevel: 'dedicated',
    },
  },
];
