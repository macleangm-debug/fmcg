import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasSeenTour: boolean;
  completedSteps: string[];
  lastViewedHelp: string | null;
  
  // Actions
  completeOnboarding: () => void;
  markTourAsSeen: () => void;
  completeStep: (stepId: string) => void;
  resetOnboarding: () => void;
  setLastViewedHelp: (helpId: string) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      hasSeenTour: false,
      completedSteps: [],
      lastViewedHelp: null,

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      
      markTourAsSeen: () => set({ hasSeenTour: true, hasCompletedOnboarding: true }),
      
      completeStep: (stepId: string) => 
        set((state) => ({
          completedSteps: state.completedSteps.includes(stepId)
            ? state.completedSteps
            : [...state.completedSteps, stepId],
        })),
      
      resetOnboarding: () => set({
        hasCompletedOnboarding: false,
        hasSeenTour: false,
        completedSteps: [],
      }),
      
      setLastViewedHelp: (helpId: string) => set({ lastViewedHelp: helpId }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
