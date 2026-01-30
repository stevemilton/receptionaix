import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingService {
  name: string;
  description?: string;
  duration?: number;
  price?: number;
}

export interface OnboardingFAQ {
  question: string;
  answer: string;
}

export interface OnboardingData {
  // Step 1: Business Search
  placeId: string | null;
  businessName: string;
  businessType: string;
  address: string;
  phone: string;
  website: string | null;

  // Step 2: Review Info
  services: OnboardingService[];
  openingHours: Record<string, string>;

  // Step 3: AI Greeting
  greeting: string;
  voiceId: string;

  // Step 4: Calendar (tokens stored server-side only)
  googleCalendarConnected: boolean;

  // Step 5: FAQs
  faqs: OnboardingFAQ[];

  // Step 6: Phone
  twilioPhoneNumber: string | null;
  forwardPhone: string;

  // Step 7: Conditions
  termsAccepted: boolean;
  privacyAccepted: boolean;
  dataSharingConsent: boolean;
  marketingConsent: boolean;

  // Metadata
  currentStep: number;
  completedSteps: number[];
  skippedSteps: number[];
}

interface OnboardingStore extends OnboardingData {
  // Hydration tracking
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;

  // Actions
  setBusinessInfo: (data: Partial<OnboardingData>) => void;
  setServices: (services: OnboardingService[]) => void;
  setOpeningHours: (hours: Record<string, string>) => void;
  setGreeting: (greeting: string) => void;
  setVoiceId: (voiceId: string) => void;
  setGoogleCalendar: (connected: boolean) => void;
  setFaqs: (faqs: OnboardingFAQ[]) => void;
  setTwilioPhone: (phone: string) => void;
  setForwardPhone: (phone: string) => void;
  setTermsAccepted: (accepted: boolean) => void;
  setPrivacyAccepted: (accepted: boolean) => void;
  setDataSharingConsent: (consent: boolean) => void;
  setMarketingConsent: (consent: boolean) => void;
  setCurrentStep: (step: number) => void;
  markStepCompleted: (step: number) => void;
  markStepSkipped: (step: number) => void;
  reset: () => void;
}

const initialState: OnboardingData = {
  placeId: null,
  businessName: '',
  businessType: '',
  address: '',
  phone: '',
  website: null,
  services: [],
  openingHours: {},
  greeting: "Hello! Thank you for calling {businessName}. How can I help you today?",
  voiceId: 'Ara',
  googleCalendarConnected: false,
  faqs: [],
  twilioPhoneNumber: null,
  forwardPhone: '',
  termsAccepted: false,
  privacyAccepted: false,
  dataSharingConsent: false,
  marketingConsent: false,
  currentStep: 1,
  completedSteps: [],
  skippedSteps: [],
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initialState,
      hasHydrated: false,

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      setBusinessInfo: (data) => set((state) => ({ ...state, ...data })),

      setServices: (services) => set({ services }),

      setOpeningHours: (openingHours) => set({ openingHours }),

      setGreeting: (greeting) => set({ greeting }),

      setVoiceId: (voiceId) => set({ voiceId }),

      setGoogleCalendar: (connected) => set({
        googleCalendarConnected: connected,
      }),

      setFaqs: (faqs) => set({ faqs }),

      setTwilioPhone: (twilioPhoneNumber) => set({ twilioPhoneNumber }),

      setForwardPhone: (forwardPhone) => set({ forwardPhone }),

      setTermsAccepted: (termsAccepted) => set({ termsAccepted }),

      setPrivacyAccepted: (privacyAccepted) => set({ privacyAccepted }),

      setDataSharingConsent: (dataSharingConsent) => set({ dataSharingConsent }),

      setMarketingConsent: (marketingConsent) => set({ marketingConsent }),

      setCurrentStep: (currentStep) => set({ currentStep }),

      markStepCompleted: (step) => set((state) => ({
        completedSteps: state.completedSteps.includes(step)
          ? state.completedSteps
          : [...state.completedSteps, step],
      })),

      markStepSkipped: (step) => set((state) => ({
        skippedSteps: state.skippedSteps.includes(step)
          ? state.skippedSteps
          : [...state.skippedSteps, step],
      })),

      reset: () => set(initialState),
    }),
    {
      name: 'receptionalx-mobile-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
