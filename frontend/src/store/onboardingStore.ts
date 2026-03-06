import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingState {
  // Core onboarding flags
  hasCompletedOnboarding: boolean;
  hasSeenTour: boolean;
  completedSteps: string[];
  lastViewedHelp: string | null;
  
  // Progressive setup tracking
  hasCompletedQuickStart: boolean;
  hasAddedFirstProduct: boolean;
  hasCompletedFirstSale: boolean;
  hasSetupPrinter: boolean;
  hasConfiguredBusiness: boolean;
  isNewUser: boolean;
  
  // Dismissed prompts
  dismissedPrompts: string[];
  
  // Actions
  completeOnboarding: () => void;
  markTourAsSeen: () => void;
  completeStep: (stepId: string) => void;
  resetOnboarding: () => void;
  setLastViewedHelp: (helpId: string) => void;
  
  // Progressive setup actions
  setQuickStartComplete: () => void;
  setFirstProductAdded: () => void;
  setFirstSaleComplete: () => void;
  setPrinterSetup: () => void;
  setBusinessConfigured: () => void;
  setIsNewUser: (isNew: boolean) => void;
  dismissPrompt: (promptId: string) => void;
  isPromptDismissed: (promptId: string) => boolean;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      hasSeenTour: false,
      completedSteps: [],
      lastViewedHelp: null,
      
      // Progressive setup defaults
      hasCompletedQuickStart: false,
      hasAddedFirstProduct: false,
      hasCompletedFirstSale: false,
      hasSetupPrinter: false,
      hasConfiguredBusiness: false,
      isNewUser: false,
      dismissedPrompts: [],

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
        hasCompletedQuickStart: false,
        hasAddedFirstProduct: false,
        hasCompletedFirstSale: false,
        hasSetupPrinter: false,
        hasConfiguredBusiness: false,
        isNewUser: false,
        dismissedPrompts: [],
      }),
      
      setLastViewedHelp: (helpId: string) => set({ lastViewedHelp: helpId }),
      
      // Progressive setup actions
      setQuickStartComplete: () => set({ hasCompletedQuickStart: true, isNewUser: false }),
      setFirstProductAdded: () => set({ hasAddedFirstProduct: true }),
      setFirstSaleComplete: () => set({ hasCompletedFirstSale: true }),
      setPrinterSetup: () => set({ hasSetupPrinter: true }),
      setBusinessConfigured: () => set({ hasConfiguredBusiness: true }),
      setIsNewUser: (isNew: boolean) => set({ isNewUser: isNew }),
      
      dismissPrompt: (promptId: string) => 
        set((state) => ({
          dismissedPrompts: state.dismissedPrompts.includes(promptId)
            ? state.dismissedPrompts
            : [...state.dismissedPrompts, promptId],
        })),
      
      isPromptDismissed: (promptId: string) => get().dismissedPrompts.includes(promptId),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
