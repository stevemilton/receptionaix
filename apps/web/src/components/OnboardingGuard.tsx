'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useOnboardingStore } from '@/lib/onboarding-store';

const STEP_PATHS: Record<number, string> = {
  1: '/onboarding/business-search',
  2: '/onboarding/review-info',
  3: '/onboarding/ai-greeting',
  4: '/onboarding/calendar-connect',
  5: '/onboarding/faq-editor',
  6: '/onboarding/phone-setup',
  7: '/onboarding/conditions',
  8: '/onboarding/complete',
};

const PATH_TO_STEP: Record<string, number> = {
  '/onboarding/business-search': 1,
  '/onboarding/review-info': 2,
  '/onboarding/ai-greeting': 3,
  '/onboarding/calendar-connect': 4,
  '/onboarding/faq-editor': 5,
  '/onboarding/phone-setup': 6,
  '/onboarding/conditions': 7,
  '/onboarding/complete': 8,
};

// Steps that are required before a given step can be accessed
const REQUIRED_STEPS: Record<number, number[]> = {
  1: [], // Business search has no prerequisites
  2: [1], // Review requires business search
  3: [1, 2], // AI greeting requires business search + review
  4: [1, 2, 3], // Calendar requires steps 1-3
  5: [1, 2, 3], // FAQs requires steps 1-3 (can skip 4)
  6: [1, 2, 3], // Phone setup requires steps 1-3 (can skip 4, 5)
  7: [1, 2, 3, 6], // Conditions requires steps 1-3 + phone setup
  8: [1, 2, 3, 6, 7], // Complete requires steps 1-3, 6, 7
};

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { completedSteps, skippedSteps, hasHydrated } = useOnboardingStore();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;

    const currentStep = PATH_TO_STEP[pathname];
    if (!currentStep) {
      // Unknown path, allow it (might be the landing page)
      setIsAllowed(true);
      return;
    }

    const requiredSteps = REQUIRED_STEPS[currentStep] || [];
    const completedOrSkipped = [...completedSteps, ...skippedSteps];

    // Check if all required steps are completed (or skipped for optional steps)
    const missingSteps = requiredSteps.filter(
      (step) => !completedOrSkipped.includes(step)
    );

    if (missingSteps.length > 0) {
      // Find the first incomplete required step
      const firstMissingStep = Math.min(...missingSteps);
      const redirectPath = STEP_PATHS[firstMissingStep];
      router.replace(redirectPath);
    } else {
      setIsAllowed(true);
    }
  }, [pathname, completedSteps, skippedSteps, hasHydrated, router]);

  // Show loading state while checking hydration
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Show loading state while checking permissions
  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return <>{children}</>;
}
