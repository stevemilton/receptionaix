/**
 * Centralized copy for all onboarding screens.
 * Edit this file to update text across all onboarding screens in one place.
 *
 * Usage: Import and use like `ONBOARDING_COPY.businessSearch.title`
 */

export const ONBOARDING_COPY = {
  // ============================================
  // STEP 1: Business Search
  // ============================================
  businessSearch: {
    stepIndicator: 'Step 1 of 8',
    title: 'Find your business',
    subtitle: 'Search for your business to automatically import details, or enter them manually.',

    form: {
      businessNameLabel: 'Business name',
      businessNamePlaceholder: 'e.g. Gielly Green Hair Salon',
      locationLabel: 'Location (optional)',
      locationPlaceholder: 'e.g. London, UK',
      locationHelperText: 'Add a location to narrow down results',
      searchButton: 'Search',
    },

    results: {
      title: 'Search Results',
    },

    loading: {
      title: 'Creating your knowledge base',
      text: "We're analysing your business website to extract services, FAQs, and opening hours.",
      subtext: 'This may take a moment...',
    },

    errors: {
      emptySearch: 'Please enter a business name',
      noResults: 'No businesses found. Try a different search term.',
    },

    actions: {
      manualEntry: 'Enter details manually instead',
      continue: 'Continue',
    },
  },

  // ============================================
  // STEP 2: Review Information
  // ============================================
  reviewInfo: {
    stepIndicator: 'Step 2 of 8',
    title: 'Review your information',
    subtitle: 'Confirm and edit your business details. This information will help your AI receptionist.',

    businessDetails: {
      title: 'Business Details',
      businessNameLabel: 'Business name',
      businessNamePlaceholder: 'Your business name',
      businessTypeLabel: 'Business type',
      businessTypePlaceholder: 'e.g. Hair Salon, Dental Practice',
      addressLabel: 'Address',
      addressPlaceholder: 'Full business address',
      phoneLabel: 'Phone',
      phonePlaceholder: '+44 20 1234 5678',
      websiteLabel: 'Website (optional)',
      websitePlaceholder: 'https://www.example.com',
    },

    services: {
      title: 'Services',
      addButton: 'Add',
      serviceLabel: 'Service {index}',
      removeButton: 'Remove',
      namePlaceholder: 'Service name',
      descriptionPlaceholder: 'Description (optional)',
      durationPlaceholder: 'Duration (mins)',
      pricePlaceholder: 'Price (£)',
    },

    openingHours: {
      title: 'Opening Hours',
      placeholder: '09:00 - 17:00 or Closed',
      helperText: 'Enter times like "09:00 - 17:00" or "Closed"',
    },

    actions: {
      back: 'Back',
      continue: 'Continue',
    },
  },

  // ============================================
  // STEP 3: AI Greeting
  // ============================================
  aiGreeting: {
    stepIndicator: 'Step 3 of 8',
    title: 'Customise your AI greeting',
    subtitle: 'Choose how your AI receptionist will greet callers.',

    greetingStyle: {
      title: 'Greeting Style',
      templates: {
        professional: {
          name: 'Professional',
          template: 'Hello, thank you for calling {businessName}. How may I assist you today?',
        },
        friendly: {
          name: 'Friendly',
          template: "Hi there! Welcome to {businessName}. How can I help you?",
        },
        formal: {
          name: 'Formal',
          template: "Good day, you've reached {businessName}. How may I direct your call?",
        },
        custom: {
          name: 'Custom',
        },
      },
    },

    customGreeting: {
      title: 'Your Greeting',
      placeholder: 'Enter your custom greeting...',
      helperText: 'Tip: Use a friendly, welcoming tone that matches your brand.',
    },

    voiceSelection: {
      title: 'Voice Selection',
      subtitle: 'Choose a voice for your AI receptionist. Powered by Grok.',
      recommendedBadge: 'Recommended',
      voices: {
        ara: { name: 'Ara', description: 'Warm & friendly (Female)' },
        rex: { name: 'Rex', description: 'Professional & articulate (Male)' },
        sal: { name: 'Sal', description: 'Smooth & versatile (Neutral)' },
        eve: { name: 'Eve', description: 'Energetic & engaging (Female)' },
        leo: { name: 'Leo', description: 'Authoritative & commanding (Male)' },
      },
    },

    actions: {
      back: 'Back',
      continue: 'Continue',
    },
  },

  // ============================================
  // STEP 4: Calendar Connect
  // ============================================
  calendarConnect: {
    stepIndicator: 'Step 4 of 8',
    title: 'Connect your calendar',
    subtitle: 'Connect Google Calendar to let your AI receptionist book appointments.',

    connected: {
      title: 'Calendar Connected',
      text: 'Your Google Calendar is connected. Your AI receptionist can now book appointments.',
      disconnectButton: 'Disconnect Calendar',
    },

    disconnected: {
      title: 'Connect Google Calendar',
      text: 'Allow your AI receptionist to check availability and book appointments.',
      connectButton: 'Connect with Google',
      connectingButton: 'Connecting...',
    },

    accessInfo: {
      title: "What we'll access:",
      items: [
        'View your calendar availability',
        'Create new calendar events',
        'View and modify existing events',
      ],
    },

    benefits: {
      title: 'Why connect your calendar?',
      items: [
        {
          title: 'Real-time availability',
          text: "AI knows when you're free to book appointments",
        },
        {
          title: 'Automatic booking',
          text: 'New appointments appear in your calendar instantly',
        },
        {
          title: 'No double bookings',
          text: 'Prevents scheduling conflicts automatically',
        },
      ],
    },

    alerts: {
      connectionTitle: 'Calendar Connection',
      connectionMessage: 'Please complete the Google Calendar connection in the browser. Once connected, return to the app.',
      skipButton: 'Skip for now',
      connectedButton: 'I connected it',
      errorMessage: 'Failed to open browser for calendar connection',
    },

    actions: {
      back: 'Back',
      skip: 'Skip for now',
      continue: 'Continue',
    },
  },

  // ============================================
  // STEP 5: FAQ Editor
  // ============================================
  faqEditor: {
    stepIndicator: 'Step 5 of 8',
    title: 'Add frequently asked questions',
    // Note: subtitle uses dynamic businessName
    subtitleTemplate: 'Help your AI receptionist answer common questions about {businessName}.',
    subtitleFallback: 'Help your AI receptionist answer common questions about your business.',

    suggestedQuestions: {
      title: 'Suggested Questions',
      subtitle: 'Click to add these common questions:',
      questions: [
        'What are your opening hours?',
        'Do you accept walk-ins?',
        'What payment methods do you accept?',
        'Do I need to book in advance?',
        'What is your cancellation policy?',
        'Do you offer gift vouchers?',
        'Is parking available?',
        'Are you wheelchair accessible?',
      ],
    },

    yourFaqs: {
      title: 'Your FAQs',
      addButton: 'Add FAQ',
      faqLabel: 'FAQ {index}',
      removeButton: 'Remove',
      questionPlaceholder: 'Question (e.g., Do you accept walk-ins?)',
      answerPlaceholder: 'Answer (e.g., Yes, we welcome walk-ins but recommend booking in advance.)',
    },

    tips: {
      title: 'Tips for good FAQs',
      items: [
        "Keep answers concise - they'll be read aloud by your AI",
        'Include specific details like prices, times, or locations',
        'Think about what callers commonly ask your business',
        'You can always add more FAQs later from your dashboard',
      ],
    },

    actions: {
      back: 'Back',
      skip: 'Skip for now',
      continue: 'Continue',
    },
  },

  // ============================================
  // STEP 6: Phone Setup
  // ============================================
  phoneSetup: {
    stepIndicator: 'Step 6 of 8',
    title: 'Set up your phone number',
    subtitle: 'Get a dedicated phone number for your AI receptionist.',

    provisioned: {
      title: 'Phone Number Ready!',
      text: 'Your AI receptionist is ready to answer calls on this number.',
    },

    forwardPhone: {
      title: 'Your personal phone number',
      subtitle: "If your AI receptionist can't take a call, calls will be forwarded to this number instead.",
      placeholder: '+44 7700 900123',
      helperText: "This should be a number you can answer personally. We'll never share it with callers.",
    },

    searchNumbers: {
      title: 'Get Your AI Receptionist Number',
      text: "We'll provision a UK phone number for your business.",
      searchButton: 'Search Available Numbers',
    },

    selectNumber: {
      title: 'Select Your Number',
      searchAgain: 'Search again',
      searching: 'Searching...',
      provisionButton: 'Provision This Number',
    },

    howItWorks: {
      title: 'How it works',
      steps: [
        {
          title: 'Forward your calls',
          text: 'Set up call forwarding from your existing business number to your AI number.',
        },
        {
          title: 'AI answers calls',
          text: 'Your AI receptionist will answer, help callers, and book appointments.',
        },
        {
          title: 'You stay informed',
          text: 'Get notifications and transcripts of every call in your dashboard.',
        },
      ],
    },

    errors: {
      noNumbers: 'No numbers available. Please try again later.',
    },

    actions: {
      back: 'Back',
      continue: 'Continue',
    },
  },

  // ============================================
  // STEP 7: Terms & Conditions
  // ============================================
  conditions: {
    stepIndicator: 'Step 7 of 8',
    title: 'Terms & Conditions',
    subtitle: 'Please review and accept our terms to continue',

    termsOfService: {
      title: 'Terms of Service',
      content: `By using ReceptionAI, you agree to the following terms:

• You are authorised to use the phone number(s) associated with your account
• You will not use the service for any unlawful purpose
• You understand that AI-generated responses may occasionally be inaccurate
• You are responsible for reviewing and managing bookings made through the service
• You agree to pay all applicable fees based on your subscription plan
• We reserve the right to suspend accounts that violate these terms
• The service is provided "as is" without warranties of any kind`,
      checkbox: 'I have read and agree to the Terms of Service',
    },

    privacyPolicy: {
      title: 'Privacy Policy',
      content: `Your privacy is important to us. Here's how we handle your data:

• We collect business information to personalise your AI receptionist
• Call recordings and transcripts are stored securely and encrypted
• We do not sell your data to third parties
• You can request deletion of your data at any time
• We use industry-standard security measures to protect your information
• Analytics data is used to improve our service
• We comply with GDPR and UK data protection regulations`,
      checkbox: 'I have read and agree to the Privacy Policy',
    },

    dataSharing: {
      title: 'Data Sharing Preferences',
      note: 'These are optional. You can change these at any time from your dashboard settings.',

      improveAi: {
        title: 'Help improve ReceptionAI for businesses like yours',
        description: 'Allow us to use anonymised, aggregated data from your knowledge base to improve suggestions for other businesses in your industry.',
      },

      marketing: {
        title: 'Receive product updates and tips',
        description: "We'll occasionally send you emails about new features and best practices.",
      },
    },

    actions: {
      back: 'Back',
      continue: 'Accept & Continue',
    },
  },

  // ============================================
  // STEP 8: Complete
  // ============================================
  complete: {
    title: "You're all set!",
    subtitle: 'Your AI receptionist is ready to start taking calls.',

    saving: {
      text: 'Saving your settings...',
    },

    error: {
      retryButton: 'Retry',
    },

    summary: {
      title: 'Setup Summary',
      services: {
        title: 'Services',
        textSingular: '{count} service configured',
        textPlural: '{count} services configured',
      },
      aiVoice: {
        title: 'AI Voice',
      },
      calendar: {
        title: 'Google Calendar',
        connected: 'Connected',
        notConnected: 'Not connected',
      },
      faqs: {
        title: 'FAQs',
        textSingular: '{count} FAQ configured',
        textPlural: '{count} FAQs configured',
      },
      phone: {
        title: 'AI Phone Number',
      },
    },

    nextSteps: {
      title: 'Next Steps',
      steps: [
        // Note: These use dynamic {phoneNumber} placeholder
        'Dial {phoneNumber} and test how it works',
        'When you\'re ready, forward your existing business number to {phoneNumber}',
        'Check your dashboard to view call transcripts and manage appointments',
      ],
    },

    actions: {
      goToDashboard: 'Go to Dashboard',
    },
  },

  // ============================================
  // Common / Shared
  // ============================================
  common: {
    back: 'Back',
    continue: 'Continue',
    skip: 'Skip for now',
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    save: 'Save',
    cancel: 'Cancel',
    remove: 'Remove',
    add: 'Add',
  },
};

// Helper function to format text with dynamic values
export function formatCopy(
  template: string,
  values: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

export default ONBOARDING_COPY;
