import { useState, useEffect } from 'react';

export const useOnboarding = () => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(seen === 'true');
    } catch (error) {
      console.error('Failed to read onboarding state:', error);
      setHasSeenOnboarding(true); // Default to seen to avoid blocking
    }
  }, []);

  const startOnboarding = () => {
    setIsOnboardingActive(true);
  };

  const completeOnboarding = () => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
    setHasSeenOnboarding(true);
    setIsOnboardingActive(false);
  };

  const resetOnboarding = () => {
    try {
      localStorage.removeItem('hasSeenOnboarding');
    } catch (error) {
      console.error('Failed to reset onboarding state:', error);
    }
    setHasSeenOnboarding(false);
  };

  return {
    hasSeenOnboarding,
    isOnboardingActive,
    startOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
};
